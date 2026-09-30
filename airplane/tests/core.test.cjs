const test = require('node:test');
const assert = require('node:assert/strict');
const Game = require('../core.js');

test('movement is bounded and diagonal movement has the same speed', () => {
  const straight = Game.create(), diagonal = Game.create();
  Game.update(straight, 0.05, { right: true });
  Game.update(diagonal, 0.05, { right: true, up: true });
  assert.ok(Math.abs(Math.hypot(diagonal.player.x - 210, diagonal.player.y - 565) - (straight.player.x - 210)) < 0.001);
  Game.moveTo(straight, -100, 900);
  assert.equal(straight.player.x, 22);
  assert.equal(straight.player.y, 612);
});

test('a bullet hits one enemy, awards points and increases the level', () => {
  const state = Game.create();
  state.score = 90;
  state.bullets = [{ x: 100, y: 110, w: 5, h: 16 }];
  state.enemies = [0, 1].map(() => ({ x: 100, y: 100, w: 32, h: 36, speed: 0, phase: 0 }));
  Game.update(state, 0.01);
  assert.equal(state.score, 100);
  assert.equal(state.level, 2);
  assert.equal(state.enemies.length, 1);
});

test('collision removes a life and invincibility prevents repeated damage', () => {
  const state = Game.create();
  const enemy = () => ({ ...state.player, speed: 0, phase: 0 });
  state.enemies = [enemy(), enemy()];
  Game.update(state, 0.01);
  assert.equal(state.lives, 2);
  Game.update(state, 0.01);
  assert.equal(state.lives, 2);
  state.invincible = 0;
  state.lives = 1;
  state.enemies = [enemy()];
  Game.update(state, 0.01);
  assert.equal(state.over, true);
  assert.equal(state.lives, 0);
  const time = state.time;
  Game.update(state, 0.05, { left: true });
  assert.equal(state.time, time);
});

test('autofire and enemy spawning run, offscreen objects are removed, restart resets state', () => {
  const state = Game.create();
  for (let i = 0; i < 25; i++) Game.update(state, 0.05, {}, () => 0.1);
  assert.ok(state.bullets.length > 0);
  assert.ok(state.enemies.length > 0);
  state.bullets.push({ x: 0, y: -30, w: 5, h: 16 });
  state.enemies.push({ x: 0, y: 700, w: 32, h: 36, speed: 0, phase: 0 });
  Game.update(state, 0.01);
  assert.ok(state.bullets.every(b => b.y > -20));
  assert.ok(state.enemies.every(e => e.y < 680));
  const fresh = Game.create();
  assert.equal(fresh.score, 0);
  assert.equal(fresh.lives, 3);
  assert.equal(fresh.over, false);
});
