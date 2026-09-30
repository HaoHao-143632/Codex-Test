const { test } = require('node:test');
const assert = require('node:assert/strict');
const { TetrisGame, SHAPES, COLS, ROWS } = require('../core.js');

function playing() { const game = new TetrisGame(() => 0.5); game.start(); return game; }
function piece(game, type, x, y) { game.active = { type, matrix: SHAPES[type].map(row => row.slice()), x, y }; }

test('starts with an empty 10 by 20 board and a valid active/next piece', () => {
  const game = playing();
  assert.equal(game.state, 'playing');
  assert.equal(game.board.length, ROWS);
  assert.ok(game.board.every(row => row.length === COLS && row.every(cell => cell === null)));
  assert.ok(SHAPES[game.active.type]); assert.ok(SHAPES[game.next]);
});

test('seven-bag generator includes every type once per bag', () => {
  const game = new TetrisGame(() => 0.5);
  const bag = [game.next, ...Array.from({ length: 6 }, () => game.drawType())];
  assert.deepEqual([...bag].sort(), Object.keys(SHAPES).sort());
});

test('movement respects both walls, floor, and settled blocks', () => {
  const game = playing(); piece(game, 'O', 0, 18);
  assert.equal(game.move(-1, 0), false); assert.equal(game.move(0, 1), false);
  assert.equal(game.move(1, 0), true);
  piece(game, 'O', 8, 0); assert.equal(game.move(1, 0), false);
  game.board[2][8] = 'J'; assert.equal(game.move(0, 1), false);
});

test('four rotations restore a piece and rotations kick away from the wall', () => {
  const game = playing(); piece(game, 'T', 4, 4);
  const original = JSON.stringify(game.active.matrix);
  for (let i = 0; i < 4; i++) assert.equal(game.rotate(), true);
  assert.equal(JSON.stringify(game.active.matrix), original);
  piece(game, 'I', 0, 0); game.rotate();
  assert.equal(game.move(-1, 0), true); assert.equal(game.move(-1, 0), true);
  assert.equal(game.rotate(), true);
  assert.ok(!game.collides(game.active.matrix, game.active.x, game.active.y));
});

test('blocked rotation leaves the original piece unchanged', () => {
  const game = playing(); piece(game, 'T', 3, 5);
  game.board = Array.from({ length: ROWS }, () => Array(COLS).fill('J'));
  game.active.matrix.forEach((row, y) => row.forEach((cell, x) => { if (cell) game.board[5 + y][3 + x] = null; }));
  const original = JSON.stringify(game.active);
  assert.equal(game.rotate(), false); assert.equal(JSON.stringify(game.active), original);
});

test('soft drop scores only successful movement; gravity scores no points', () => {
  const game = playing(); piece(game, 'O', 0, 0);
  game.step(); assert.equal(game.score, 0);
  game.step(true); assert.equal(game.score, 1);
  piece(game, 'O', 0, 18); game.step(true);
  assert.equal(game.score, 1); assert.equal(game.board[19][0], 'O');
});

test('hard drop agrees with ghost position, scores distance, and spawns next', () => {
  const game = playing(); piece(game, 'O', 0, 0);
  assert.equal(game.ghostY(), 18);
  const next = game.next;
  assert.equal(game.hardDrop(), 18); assert.equal(game.score, 36);
  assert.equal(game.board[18][0], 'O'); assert.equal(game.board[19][1], 'O');
  assert.equal(game.active.type, next);
});

for (const [count, score] of [[1, 100], [2, 300], [3, 500], [4, 800]]) {
  test(`clears ${count} adjacent lines with ${score} points and independent new rows`, () => {
    const game = playing();
    for (let y = ROWS - count; y < ROWS; y++) game.board[y].fill('I');
    game.board[ROWS - count - 1][0] = 'T';
    assert.equal(game.clearLines(), count);
    assert.equal(game.lines, count); assert.equal(game.score, score);
    assert.equal(game.board.length, ROWS); assert.equal(game.board[19][0], 'T');
    game.board[0][0] = 'J'; assert.equal(game.board[1][0], null);
  });
}

test('locking a piece completes and removes two rows', () => {
  const game = playing();
  for (const y of [18, 19]) { game.board[y].fill('J'); game.board[y][4] = null; game.board[y][5] = null; }
  piece(game, 'O', 4, 18); game.step();
  assert.equal(game.lines, 2); assert.equal(game.score, 300);
  assert.ok(game.board.every(row => row.every(cell => cell === null)));
});

test('clears nonadjacent rows while preserving intervening blocks', () => {
  const game = playing(); game.board[19].fill('I'); game.board[17].fill('I'); game.board[18][2] = 'S';
  assert.equal(game.clearLines(), 2); assert.equal(game.board[19][2], 'S');
});

test('level changes at ten lines; score uses the prior level; speed has a floor', () => {
  const game = playing(); game.lines = 9; game.board[19].fill('I');
  game.clearLines(); assert.equal(game.level, 2); assert.equal(game.score, 100);
  assert.ok(game.interval < 800);
  game.board[19].fill('I'); game.clearLines(); assert.equal(game.score, 300);
  game.level = 100; assert.equal(game.interval, 100);
});

test('paused state freezes input; resume and restart restore play', () => {
  const game = playing(); game.pause();
  const original = JSON.stringify({ board: game.board, active: game.active, score: game.score });
  assert.equal(game.move(1, 0), false); assert.equal(game.rotate(), false);
  assert.equal(game.step(true), false); assert.equal(game.hardDrop(), 0);
  assert.equal(JSON.stringify({ board: game.board, active: game.active, score: game.score }), original);
  game.pause(); assert.equal(game.state, 'playing');
  game.score = 100; game.lines = 20; game.level = 3; game.start();
  assert.equal(game.score, 0); assert.equal(game.lines, 0); assert.equal(game.level, 1);
});

test('blocked spawn ends the game and prevents further actions', () => {
  const game = playing(); game.board[0].fill('J'); game.board[1].fill('J'); game.spawn();
  assert.equal(game.state, 'over'); assert.equal(game.move(1, 0), false);
  assert.equal(game.hardDrop(), 0); game.pause(); assert.equal(game.state, 'over');
});
