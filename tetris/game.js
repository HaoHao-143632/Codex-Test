(function () {
  'use strict';
  const { TetrisGame, SHAPES, COLORS, COLS, ROWS } = window.Tetris;
  const game = new TetrisGame();
  const $ = id => document.getElementById(id);
  const canvas = $('board'), ctx = canvas.getContext('2d');
  const preview = $('next'), nextCtx = preview.getContext('2d');
  let elapsed = 0, lastTime = performance.now();
  const cell = canvas.width / COLS;

  function block(context, x, y, size, color, ghost = false) {
    context.fillStyle = color;
    context.globalAlpha = ghost ? 0.12 : 1;
    context.fillRect(x + 2, y + 2, size - 4, size - 4);
    context.globalAlpha = ghost ? 0.5 : 0.8;
    context.strokeStyle = color;
    context.strokeRect(x + 2.5, y + 2.5, size - 5, size - 5);
    if (!ghost) {
      context.globalAlpha = 0.28; context.fillStyle = '#fff';
      context.fillRect(x + 3, y + 3, size - 6, 3);
    }
    context.globalAlpha = 1;
  }
  function drawPiece(piece, y, ghost = false) {
    piece.matrix.forEach((row, dy) => row.forEach((value, dx) => {
      if (value) block(ctx, (piece.x + dx) * cell, (y + dy) * cell, cell, COLORS[piece.type], ghost);
    }));
  }
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#222538'; ctx.lineWidth = 0.5;
    for (let x = 1; x < COLS; x++) { ctx.beginPath(); ctx.moveTo(x * cell, 0); ctx.lineTo(x * cell, canvas.height); ctx.stroke(); }
    for (let y = 1; y < ROWS; y++) { ctx.beginPath(); ctx.moveTo(0, y * cell); ctx.lineTo(canvas.width, y * cell); ctx.stroke(); }
    game.board.forEach((row, y) => row.forEach((type, x) => { if (type) block(ctx, x * cell, y * cell, cell, COLORS[type]); }));
    if (game.active && game.state !== 'over') { drawPiece(game.active, game.ghostY(), true); drawPiece(game.active, game.active.y); }
    nextCtx.clearRect(0, 0, preview.width, preview.height);
    const shape = SHAPES[game.next];
    const occupied = [];
    shape.forEach((row, y) => row.forEach((v, x) => { if (v) occupied.push([x, y]); }));
    const minX = Math.min(...occupied.map(p => p[0])), maxX = Math.max(...occupied.map(p => p[0]));
    const minY = Math.min(...occupied.map(p => p[1])), maxY = Math.max(...occupied.map(p => p[1]));
    const size = 24, ox = (preview.width - (maxX - minX + 1) * size) / 2, oy = (preview.height - (maxY - minY + 1) * size) / 2;
    occupied.forEach(([x, y]) => block(nextCtx, ox + (x - minX) * size, oy + (y - minY) * size, size, COLORS[game.next]));
    $('score').textContent = game.score.toLocaleString('zh-CN');
    $('level').textContent = String(game.level).padStart(2, '0');
    $('lines').textContent = game.lines;
    $('progress-fill').style.width = `${game.lines % 10 * 10}%`;
    $('progress-text').textContent = `再消除 ${10 - game.lines % 10} 行升级`;
    $('status').textContent = { ready: '准备就绪', playing: '游戏进行中', paused: '已暂停', over: '游戏结束' }[game.state];
    $('pause').disabled = !['playing', 'paused'].includes(game.state);
    $('pause').textContent = game.state === 'paused' ? '继续游戏' : '暂停游戏';
    $('overlay').hidden = game.state === 'playing';
    $('overlay-label').textContent = { ready: 'READY TO PLAY', playing: '', paused: 'PAUSED', over: 'GAME OVER' }[game.state];
    if (game.state === 'paused') {
      $('overlay-title').textContent = '休息一下'; $('overlay-text').textContent = '按 P 或点击下方按钮继续。'; $('overlay-button').textContent = '继续游戏 →';
    } else if (game.state === 'over') {
      $('overlay-title').textContent = '游戏结束'; $('overlay-text').textContent = `本次得分 ${game.score}，已消除 ${game.lines} 行。`; $('overlay-button').textContent = '再玩一次 →';
    }
  }
  function start() { game.start(); elapsed = 0; lastTime = performance.now(); draw(); }
  function pause() { game.pause(); elapsed = 0; lastTime = performance.now(); draw(); }
  function act(action) {
    if (game.state !== 'playing') return;
    if (action === 'left') game.move(-1, 0);
    if (action === 'right') game.move(1, 0);
    if (action === 'rotate') game.rotate();
    if (action === 'down') { game.step(true); elapsed = 0; }
    if (action === 'drop') { game.hardDrop(); elapsed = 0; }
    draw();
  }
  const keys = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'rotate', ArrowDown: 'down', Space: 'drop' };
  document.addEventListener('keydown', event => {
    // Keep ordinary keyboard activation available while a button has focus.
    if (event.code === 'Space' && event.target.closest('button')) return;
    if (keys[event.code]) {
      event.preventDefault();
      if (event.repeat && ['Space', 'ArrowUp'].includes(event.code)) return;
      act(keys[event.code]);
    } else if (event.code === 'KeyP' && !event.repeat) { event.preventDefault(); pause(); }
  });
  $('overlay-button').addEventListener('click', () => { if (game.state === 'paused') pause(); else start(); $('overlay-button').blur(); });
  $('restart').addEventListener('click', () => { start(); $('restart').blur(); });
  $('pause').addEventListener('click', () => { pause(); $('pause').blur(); });
  document.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => { act(button.dataset.action); button.blur(); }));
  function autoPause() { if (game.state === 'playing') pause(); }
  window.addEventListener('blur', autoPause);
  document.addEventListener('visibilitychange', () => { if (document.hidden) autoPause(); });
  function frame(time) {
    if (game.state === 'playing') {
      elapsed += Math.min(time - lastTime, 250);
      if (elapsed >= game.interval) { elapsed %= game.interval; game.step(); draw(); }
    }
    lastTime = time; requestAnimationFrame(frame);
  }
  draw(); requestAnimationFrame(frame);
})();
