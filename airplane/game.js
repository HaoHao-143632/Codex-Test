(() => {
  'use strict';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const $ = id => document.getElementById(id);
  const keys = new Set();
  let state = PlaneGame.create(), mode = 'ready', lastTime = 0, pointer = null, best = 0;
  try { best = Number(localStorage.getItem('airplane-best')) || 0; } catch (_) { /* Storage can be unavailable for local pages. */ }
  const stars = Array.from({ length: 65 }, () => ({ x: Math.random() * 420, y: Math.random() * 640, size: Math.random() * 1.5 + 0.5, speed: Math.random() * 30 + 15 }));
  function stats() {
    $('score').textContent = state.score;
    $('flight-score').textContent = state.score;
    $('lives').textContent = '♥ '.repeat(state.lives).trim() || '—';
    $('level').textContent = String(state.level).padStart(2, '0');
    if (state.score > best) {
      best = state.score;
      try { localStorage.setItem('airplane-best', String(best)); } catch (_) { /* Keep an in-memory record. */ }
    }
    $('best').textContent = best;
  }
  function clearPointer() {
    const id = pointer && pointer.id;
    pointer = null;
    if (id !== null && canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
  }
  function setMode(next) {
    mode = next;
    keys.clear();
    clearPointer();
    lastTime = 0;
    $('overlay').hidden = next === 'playing';
    $('pause').textContent = { ready: '开始游戏', playing: '暂停游戏', paused: '继续游戏', over: '再玩一次' }[next];
    const copy = {
      ready: ['准备起飞', 'READY FOR TAKEOFF', '准备起飞', '驾驶小飞机，躲避敌机。子弹自动发射，你只管飞！', '开始游戏 →'],
      playing: ['飞行中', '', '', '', ''],
      paused: ['已暂停', 'FLIGHT PAUSED', '休息一下', '准备好了，就继续这次飞行。', '继续游戏 →'],
      over: ['游戏结束', 'GAME OVER', '游戏结束', `本局得分 ${state.score} · 最高得分 ${best}`, '再玩一次 ↻']
    }[next];
    ['status', 'overlay-label', 'overlay-title', 'overlay-text', 'start'].forEach((id, i) => $(id).textContent = copy[i]);
  }
  function start() { state = PlaneGame.create(); stats(); setMode('playing'); }
  function togglePause() { if (mode === 'playing') setMode('paused'); else if (mode === 'paused') setMode('playing'); }
  $('start').addEventListener('click', () => mode === 'paused' ? setMode('playing') : start());
  $('restart').addEventListener('click', start);
  $('pause').addEventListener('click', () => mode === 'ready' || mode === 'over' ? start() : togglePause());
  const movement = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down' };
  window.addEventListener('keydown', event => {
    if (movement[event.code]) {
      if (mode === 'playing') { event.preventDefault(); keys.add(event.code); }
    } else if ((event.code === 'KeyP' || event.code === 'Space') && !event.repeat && (mode === 'playing' || mode === 'paused')) {
      if (event.target.closest('button') && event.code === 'Space') return;
      event.preventDefault(); togglePause();
    }
  });
  window.addEventListener('keyup', event => keys.delete(event.code));
  window.addEventListener('blur', () => { if (mode === 'playing') setMode('paused'); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && mode === 'playing') setMode('paused'); });
  function drag(event) {
    const rect = canvas.getBoundingClientRect();
    PlaneGame.moveTo(state,
      state.player.x + (event.clientX - pointer.x) * PlaneGame.WIDTH / rect.width,
      state.player.y + (event.clientY - pointer.y) * PlaneGame.HEIGHT / rect.height);
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  }
  canvas.addEventListener('pointerdown', event => {
    if (mode !== 'playing' || pointer !== null || !event.isPrimary || event.button !== 0) return;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(pointer.id);
  });
  canvas.addEventListener('pointermove', event => {
    if (mode === 'playing' && pointer && pointer.id === event.pointerId) drag(event);
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(name, event => {
    if (pointer && pointer.id === event.pointerId) clearPointer();
  });
  window.addEventListener('resize', () => { if (mode === 'playing') setMode('paused'); });
  function plane(x, y, color, enemy) {
    ctx.save(); ctx.translate(x, y); if (enemy) ctx.rotate(Math.PI);
    ctx.shadowColor = color; ctx.shadowBlur = enemy ? 8 : 18;
    ctx.fillStyle = color; ctx.beginPath();
    ctx.moveTo(0, -23); ctx.lineTo(7, -3); ctx.lineTo(22, 13); ctx.lineTo(7, 9); ctx.lineTo(5, 21); ctx.lineTo(0, 17); ctx.lineTo(-5, 21); ctx.lineTo(-7, 9); ctx.lineTo(-22, 13); ctx.lineTo(-7, -3); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = '#12283a'; ctx.fillRect(-2, -7, 4, 12);
    if (!enemy) { ctx.fillStyle = '#ffdca0'; ctx.fillRect(-3, 23, 6, 8 + Math.sin(state.time * 30) * 4); }
    ctx.restore();
  }
  function draw() {
    const bg = ctx.createLinearGradient(0, 0, 0, 640); bg.addColorStop(0, '#0b1527'); bg.addColorStop(1, '#132c43');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 420, 640);
    for (const star of stars) { ctx.fillStyle = '#8ab5d47a'; ctx.fillRect(star.x, (star.y + state.time * star.speed) % 640, star.size, star.size * 2); }
    ctx.strokeStyle = '#7da9c009'; ctx.lineWidth = 1;
    for (let x = 0; x < 420; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 640); ctx.stroke(); }
    ctx.fillStyle = '#c7ffff'; ctx.shadowBlur = 10; ctx.shadowColor = '#75e8ee';
    for (const bullet of state.bullets) ctx.fillRect(bullet.x - 2, bullet.y - 8, 4, 16);
    ctx.shadowBlur = 0;
    for (const enemy of state.enemies) plane(enemy.x, enemy.y, '#fc8f9d', true);
    if (!state.over && (state.invincible === 0 || Math.floor(state.invincible * 12) % 2 === 0)) plane(state.player.x, state.player.y, '#8ae9ed', false);
    for (const effect of state.effects) {
      ctx.globalAlpha = effect.life / 0.35; ctx.strokeStyle = effect.color; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(effect.x, effect.y, (1 - effect.life / 0.35) * 32 + 5, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
  function frame(now) {
    const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 0; lastTime = now;
    if (mode === 'playing') {
      const input = {};
      for (const key of keys) input[movement[key]] = true;
      PlaneGame.update(state, dt, input); stats();
      if (state.over) setMode('over');
    }
    draw(); requestAnimationFrame(frame);
  }
  stats(); setMode('ready'); requestAnimationFrame(frame);
})();
