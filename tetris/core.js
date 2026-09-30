/* Pure game rules; shared by the browser and Node.js checks. */
(function (root) {
  'use strict';
  const COLS = 10, ROWS = 20;
  const SHAPES = {
    I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    J: [[1,0,0],[1,1,1],[0,0,0]],
    L: [[0,0,1],[1,1,1],[0,0,0]],
    O: [[1,1],[1,1]],
    S: [[0,1,1],[1,1,0],[0,0,0]],
    T: [[0,1,0],[1,1,1],[0,0,0]],
    Z: [[1,1,0],[0,1,1],[0,0,0]]
  };
  const COLORS = { I: '#68dce8', J: '#7c9cfb', L: '#f5b36d', O: '#edd778', S: '#80d8a0', T: '#bc94f5', Z: '#f388a6' };
  const copy = matrix => matrix.map(row => row.slice());
  const emptyRow = () => Array(COLS).fill(null);

  class TetrisGame {
    constructor(random = Math.random) { this.random = random; this.reset(); }
    reset() {
      this.board = Array.from({ length: ROWS }, emptyRow);
      this.bag = []; this.score = 0; this.lines = 0; this.level = 1;
      this.state = 'ready'; this.active = null; this.next = this.drawType();
    }
    drawType() {
      if (!this.bag.length) {
        this.bag = Object.keys(SHAPES);
        for (let i = this.bag.length - 1; i > 0; i--) {
          const j = Math.floor(this.random() * (i + 1));
          [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
        }
      }
      return this.bag.pop();
    }
    start() { this.reset(); this.state = 'playing'; this.spawn(); }
    spawn() {
      const type = this.next;
      this.next = this.drawType();
      const matrix = copy(SHAPES[type]);
      this.active = { type, matrix, x: Math.floor((COLS - matrix.length) / 2), y: 0 };
      if (this.collides(matrix, this.active.x, this.active.y)) this.state = 'over';
    }
    collides(matrix, x, y) {
      return matrix.some((row, dy) => row.some((cell, dx) => cell && (
        x + dx < 0 || x + dx >= COLS || y + dy >= ROWS ||
        (y + dy >= 0 && this.board[y + dy][x + dx] !== null)
      )));
    }
    move(dx, dy) {
      if (this.state !== 'playing') return false;
      const piece = this.active;
      if (this.collides(piece.matrix, piece.x + dx, piece.y + dy)) return false;
      piece.x += dx; piece.y += dy; return true;
    }
    rotate() {
      if (this.state !== 'playing' || this.active.type === 'O') return false;
      const piece = this.active;
      const matrix = piece.matrix[0].map((_, x) => piece.matrix.map(row => row[x]).reverse());
      // Small horizontal wall kicks allow rotations alongside either wall.
      for (const offset of [0, -1, 1, -2, 2]) {
        if (!this.collides(matrix, piece.x + offset, piece.y)) {
          piece.matrix = matrix; piece.x += offset; return true;
        }
      }
      return false;
    }
    step(soft = false) {
      if (this.state !== 'playing') return false;
      if (this.move(0, 1)) { if (soft) this.score += 1; return true; }
      this.lock(); return false;
    }
    hardDrop() {
      if (this.state !== 'playing') return 0;
      let distance = 0;
      while (this.move(0, 1)) distance++;
      this.score += distance * 2; this.lock(); return distance;
    }
    ghostY() {
      if (!this.active) return 0;
      let y = this.active.y;
      while (!this.collides(this.active.matrix, this.active.x, y + 1)) y++;
      return y;
    }
    lock() {
      const piece = this.active;
      const aboveTop = piece.matrix.some((row, dy) => row.some(cell => cell && piece.y + dy < 0));
      if (aboveTop) { this.state = 'over'; return; }
      piece.matrix.forEach((row, dy) => row.forEach((cell, dx) => {
        if (cell) this.board[piece.y + dy][piece.x + dx] = piece.type;
      }));
      this.clearLines(); this.spawn();
    }
    clearLines() {
      const remaining = this.board.filter(row => row.some(cell => cell === null));
      const count = ROWS - remaining.length;
      if (count) {
        this.score += [0, 100, 300, 500, 800][count] * this.level;
        this.lines += count; this.level = 1 + Math.floor(this.lines / 10);
        this.board = [...Array.from({ length: count }, emptyRow), ...remaining];
      }
      return count;
    }
    pause() {
      if (this.state === 'playing') this.state = 'paused';
      else if (this.state === 'paused') this.state = 'playing';
    }
    get interval() { return Math.max(100, 800 * Math.pow(0.82, this.level - 1)); }
  }
  const api = { TetrisGame, SHAPES, COLORS, COLS, ROWS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Tetris = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
