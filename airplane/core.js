(function (root) {
  'use strict';
  const WIDTH = 420, HEIGHT = 640;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const hit = (a, b) => Math.abs(a.x - b.x) < a.w / 2 + b.w / 2 && Math.abs(a.y - b.y) < a.h / 2 + b.h / 2;
  function create() {
    return { player: { x: WIDTH / 2, y: HEIGHT - 75, w: 28, h: 36 }, bullets: [], enemies: [], effects: [], score: 0, lives: 3, level: 1, invincible: 0, fireTime: 0, spawnTime: 0.6, time: 0, over: false };
  }
  function moveTo(state, x, y) {
    state.player.x = clamp(x, 22, WIDTH - 22);
    state.player.y = clamp(y, 28, HEIGHT - 28);
  }
  function burst(state, x, y, color) {
    state.effects.push({ x, y, color, life: 0.35 });
  }
  function update(state, dt, input = {}, random = Math.random) {
    if (state.over) return;
    dt = clamp(dt, 0, 0.05);
    state.time += dt;
    state.invincible = Math.max(0, state.invincible - dt);
    const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    const speed = 285 * dt / (dx && dy ? Math.SQRT2 : 1);
    moveTo(state, state.player.x + dx * speed, state.player.y + dy * speed);
    state.fireTime -= dt;
    if (state.fireTime <= 0) {
      state.bullets.push({ x: state.player.x, y: state.player.y - 25, w: 5, h: 16 });
      state.fireTime = 0.16;
    }
    state.spawnTime -= dt;
    if (state.spawnTime <= 0) {
      state.enemies.push({ x: 28 + random() * (WIDTH - 56), y: -28, w: 32, h: 36, speed: 95 + state.level * 17 + random() * 40, phase: random() * Math.PI * 2 });
      state.spawnTime = Math.max(0.25, 0.85 - state.level * 0.045);
    }
    for (const bullet of state.bullets) bullet.y -= 540 * dt;
    for (const enemy of state.enemies) {
      enemy.y += enemy.speed * dt;
      enemy.x = clamp(enemy.x + Math.sin(state.time * 2 + enemy.phase) * 24 * dt, 22, WIDTH - 22);
    }
    for (const enemy of state.enemies) {
      for (const bullet of state.bullets) {
        if (!enemy.dead && !bullet.dead && hit(enemy, bullet)) {
          enemy.dead = bullet.dead = true;
          state.score += 10;
          burst(state, enemy.x, enemy.y, '#ffb76a');
        }
      }
      if (!enemy.dead && state.invincible === 0 && hit(enemy, state.player)) {
        enemy.dead = true;
        state.lives--;
        state.invincible = 1.8;
        burst(state, state.player.x, state.player.y, '#8ae9ed');
        if (state.lives <= 0) state.over = true;
      }
    }
    state.level = 1 + Math.floor(state.score / 100);
    state.bullets = state.bullets.filter(bullet => !bullet.dead && bullet.y > -20);
    state.enemies = state.enemies.filter(enemy => !enemy.dead && enemy.y < HEIGHT + 40);
    for (const effect of state.effects) effect.life -= dt;
    state.effects = state.effects.filter(effect => effect.life > 0);
  }
  const api = { WIDTH, HEIGHT, create, moveTo, update };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PlaneGame = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
