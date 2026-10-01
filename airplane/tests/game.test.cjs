const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Game = require('../core.js');

// Exercise the real UI controller without adding runtime dependencies.
function setup() {
  const target = () => ({
    listeners: {}, textContent: '', hidden: false,
    addEventListener(name, handler) { (this.listeners[name] ||= []).push(handler); },
    emit(name, props = {}) {
      const event = { preventDefault() {}, target: { closest: () => null }, ...props };
      for (const handler of this.listeners[name] || []) handler(event);
    }
  });
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const elements = Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(([, id]) => [id, target()]));
  const canvas = elements.game;
  const captures = new Set();
  canvas.getContext = () => new Proxy({}, { get: (_, key) => key === 'createLinearGradient' ? () => ({ addColorStop() {} }) : () => {} });
  canvas.getBoundingClientRect = () => ({ left: 10, top: 20, width: 210, height: 320 });
  canvas.setPointerCapture = id => captures.add(id);
  canvas.hasPointerCapture = id => captures.has(id);
  canvas.releasePointerCapture = id => { captures.delete(id); canvas.emit('lostpointercapture', { pointerId: id }); };
  const window = target(), document = target();
  document.getElementById = id => elements[id];
  let state, nextFrame;
  const context = vm.createContext({
    window, document,
    localStorage: { getItem() { throw new Error('Storage blocked'); }, setItem() { throw new Error('Storage blocked'); } },
    PlaneGame: { ...Game, create() { state = Game.create(); return state; } },
    requestAnimationFrame(callback) { nextFrame = callback; }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../game.js'), 'utf8'), context);
  return {
    elements, canvas, window, document, captures,
    get state() { return state; },
    click(id) { elements[id].emit('click'); },
    frame(now) { nextFrame(now); },
    touch(type, x, y, id = 1, isPrimary = true) {
      canvas.emit(type, { pointerId: id, clientX: x, clientY: y, isPrimary, button: 0 });
    }
  };
}

test('start, pause, resume and restart keep the controls and game state consistent', () => {
  const ui = setup();
  assert.equal(ui.elements.pause.textContent, '开始游戏');
  ui.click('pause');
  assert.equal(ui.elements.overlay.hidden, true);
  ui.frame(100); ui.frame(150);
  const time = ui.state.time;
  ui.click('pause'); ui.frame(200);
  assert.equal(ui.state.time, time);
  assert.equal(ui.elements.pause.textContent, '继续游戏');
  ui.click('start'); ui.frame(10000);
  assert.equal(ui.state.time, time, 'resuming must not advance by time spent paused');
  ui.frame(10050);
  assert.ok(ui.state.time > time);
  ui.state.score = 80; ui.state.lives = 1;
  ui.click('pause'); ui.click('restart');
  assert.equal(ui.state.score, 0);
  assert.equal(ui.state.lives, 3);
  assert.equal(ui.state.time, 0);
  assert.equal(ui.elements.overlay.hidden, true);
  assert.equal(ui.elements['flight-score'].textContent, 0);
});

test('relative drag does not jump, scales to the canvas and ignores other fingers', () => {
  const ui = setup();
  ui.click('start');
  const { x, y } = ui.state.player;
  ui.touch('pointerdown', 40, 50);
  assert.equal(ui.state.player.x, x);
  assert.equal(ui.state.player.y, y);
  ui.touch('pointerdown', 100, 100, 2, false);
  ui.touch('pointermove', 150, 150, 2, false);
  assert.equal(ui.state.player.x, x);
  ui.touch('pointermove', 60, 30);
  assert.equal(ui.state.player.x, x + 40);
  assert.equal(ui.state.player.y, y - 40);
  ui.touch('pointermove', -1000, 2000);
  assert.equal(ui.state.player.x, 22);
  assert.equal(ui.state.player.y, 612);
  ui.touch('pointermove', -990, 1990);
  assert.equal(ui.state.player.x, 42, 'reversing at an edge should respond immediately');
});

test('release, cancellation and capture loss stop dragging and allow a fresh gesture', () => {
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    const ui = setup();
    ui.click('start');
    ui.touch('pointerdown', 40, 50);
    ui.touch(type, 40, 50);
    ui.touch('pointermove', 80, 100);
    assert.equal(ui.state.player.x, 210);
    assert.equal(ui.captures.size, 0);
    ui.touch('pointerdown', 40, 50, 2);
    ui.touch('pointermove', 50, 50, 2);
    assert.equal(ui.state.player.x, 230);
  }
});

test('pause clears held keys and pointer capture; background and resize pause play', () => {
  for (const cause of ['blur', 'visibilitychange', 'resize']) {
    const ui = setup();
    ui.click('start');
    ui.window.emit('keydown', { code: 'ArrowLeft' });
    ui.touch('pointerdown', 40, 50);
    if (cause === 'visibilitychange') { ui.document.hidden = true; ui.document.emit(cause); }
    else ui.window.emit(cause);
    assert.equal(ui.elements.status.textContent, '已暂停');
    assert.equal(ui.captures.size, 0);
    ui.click('pause');
    ui.touch('pointermove', 100, 100);
    ui.frame(100); ui.frame(150);
    assert.equal(ui.state.player.x, 210);
  }
});

test('score and game-over message update, and replay resets play while retaining best score', () => {
  const ui = setup();
  ui.click('start');
  ui.state.bullets = [{ x: 100, y: 100, w: 5, h: 16 }];
  ui.state.enemies = [{ x: 100, y: 100, w: 32, h: 36, speed: 0, phase: 0 }];
  ui.frame(100);
  assert.equal(ui.elements['flight-score'].textContent, 10);
  assert.equal(ui.elements.score.textContent, 10);
  ui.state.lives = 1;
  ui.state.enemies = [{ ...ui.state.player, speed: 0, phase: 0 }];
  ui.frame(150);
  assert.equal(ui.elements['overlay-title'].textContent, '游戏结束');
  assert.equal(ui.elements.overlay.hidden, false);
  assert.match(ui.elements['overlay-text'].textContent, /本局得分 10 · 最高得分 10/);
  const time = ui.state.time;
  ui.frame(200);
  assert.equal(ui.state.time, time);
  ui.click('pause');
  assert.equal(ui.state.over, false);
  assert.equal(ui.state.score, 0);
  assert.equal(ui.elements.best.textContent, 10);
});
