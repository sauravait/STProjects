'use strict';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayMessage = document.getElementById('overlayMessage');
const controlHelp = document.getElementById('controlHelp');

const hud = document.getElementById('hud');
const healthFill = document.getElementById('healthFill');
const powerFill = document.getElementById('powerFill');
const levelText = document.getElementById('levelText');
const scoreText = document.getElementById('scoreText');
const enemyText = document.getElementById('enemyText');
const progressText = document.getElementById('progressText');

const startBtn = document.getElementById('startBtn');
const instructionsBtn = document.getElementById('instructionsBtn');
const resumeBtn = document.getElementById('resumeBtn');
const nextBtn = document.getElementById('nextBtn');
const restartBtn = document.getElementById('restartBtn');
const menuBtn = document.getElementById('menuBtn');

const keys = {};
const GRAVITY = 1900;
const GROUND_Y = canvas.height - 78;

class SoundManager {
  constructor() {
    this.ctx = null;
  }

  unlock() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
  }

  play(type) {
    if (!this.ctx) return;
    const cfg = {
      shoot: { f: 560, t: 0.07, g: 0.03, wave: 'triangle' },
      hit: { f: 210, t: 0.09, g: 0.05, wave: 'square' },
      pickup: { f: 740, t: 0.12, g: 0.04, wave: 'sine' },
      death: { f: 120, t: 0.25, g: 0.06, wave: 'sawtooth' },
      victory: { f: 880, t: 0.2, g: 0.06, wave: 'triangle' }
    }[type] || { f: 360, t: 0.1, g: 0.04, wave: 'sine' };

    const o = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    o.type = cfg.wave;
    o.frequency.value = cfg.f;
    gain.gain.value = cfg.g;
    o.connect(gain);
    gain.connect(this.ctx.destination);
    o.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + cfg.t);
    o.stop(this.ctx.currentTime + cfg.t);
  }
}

class Projectile {
  constructor(x, y, vx, vy, damage, owner) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.damage = damage;
    this.owner = owner;
    this.width = owner === 'player' ? 24 : 20;
    this.height = 5;
    this.dead = false;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.x < -200 || this.x > game.levelManager.current.distance + 200 || this.y < -100 || this.y > canvas.height + 100) {
      this.dead = true;
    }
  }

  draw(cameraX) {
    const sx = this.x - cameraX;
    ctx.save();
    ctx.translate(sx, this.y);
    ctx.rotate(Math.atan2(this.vy, this.vx));
    ctx.fillStyle = this.owner === 'player' ? '#111827' : '#7f1d1d';
    ctx.fillRect(-this.width * 0.55, -this.height * 0.5, this.width, this.height);
    ctx.fillStyle = this.owner === 'player' ? '#f59e0b' : '#fecaca';
    ctx.beginPath();
    ctx.moveTo(this.width * 0.55, 0);
    ctx.lineTo(this.width * 0.3, -4);
    ctx.lineTo(this.width * 0.3, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

class PowerUp {
  constructor(x, y, value) {
    this.x = x;
    this.y = y;
    this.baseY = y;
    this.value = value;
    this.radius = value === 100 ? 18 : value === 30 ? 14 : 12;
    this.dead = false;
    this.time = 0;
  }

  update(dt) {
    this.time += dt;
    this.y = this.baseY + Math.sin(this.time * 4) * 6;
  }

  apply(player) {
    if (this.value === 20) {
      player.health = Math.min(player.maxHealth, player.health + 20);
      game.spawnText(this.x, this.y - 22, '+20 HP', '#22c55e');
    } else if (this.value === 30) {
      player.power = Math.min(player.maxPower, player.power + 30);
      player.fireBoost = Math.max(player.fireBoost, 5);
      game.spawnText(this.x, this.y - 22, '+30 Power / Rapid Fire', '#38bdf8');
    } else {
      player.power = Math.min(player.maxPower, player.power + 40);
      player.shieldTimer = Math.max(player.shieldTimer, 8);
      player.health = Math.min(player.maxHealth, player.health + 10);
      game.spawnText(this.x, this.y - 22, '100: Shield + Boost', '#f59e0b');
    }
    game.sound.play('pickup');
    this.dead = true;
  }

  draw(cameraX) {
    const sx = this.x - cameraX;
    const color = this.value === 100 ? '#f59e0b' : this.value === 30 ? '#38bdf8' : '#22c55e';
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(sx, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.font = `bold ${this.value === 100 ? 14 : 12}px Segoe UI`;
    ctx.textAlign = 'center';
    ctx.fillText(String(this.value), sx, this.y + 4);
    ctx.textAlign = 'start';
  }
}

class Enemy {
  constructor(opts) {
    this.x = opts.x;
    this.y = GROUND_Y;
    this.width = opts.elite ? 42 : 34;
    this.height = opts.elite ? 66 : 58;
    this.color = opts.color || '#7f1d1d';
    this.hp = opts.hp;
    this.maxHp = opts.hp;
    this.speed = opts.speed;
    this.fireRate = opts.fireRate;
    this.projectileSpeed = opts.projectileSpeed;
    this.damage = opts.damage;
    this.accuracy = opts.accuracy;
    this.cooldown = Math.random() * this.fireRate;
    this.side = opts.side;
    this.scoreValue = opts.scoreValue;
    this.dead = false;
    this.pulse = Math.random() * Math.PI;
    this.elite = !!opts.elite;
  }

  update(dt, player) {
    this.pulse += dt * 6;
    this.cooldown -= dt;

    const dist = player.x - this.x;
    const moveDir = Math.sign(dist);
    if (Math.abs(dist) > 230) {
      this.x += moveDir * this.speed * dt;
    }

    if (this.cooldown <= 0 && Math.abs(dist) < 760) {
      this.cooldown = this.fireRate;
      const tx = player.x + (Math.random() * 2 - 1) * this.accuracy;
      const ty = player.y - player.height * 0.7;
      const sx = this.x + Math.sign(dist) * 16;
      const sy = this.y - this.height * 0.72;
      const angle = Math.atan2(ty - sy, tx - sx);
      game.enemyProjectiles.push(new Projectile(
        sx,
        sy,
        Math.cos(angle) * this.projectileSpeed,
        Math.sin(angle) * this.projectileSpeed,
        this.damage,
        'enemy'
      ));
    }
  }

  hit(dmg) {
    this.hp -= dmg;
    game.spawnText(this.x, this.y - this.height - 8, `-${dmg}`, '#fca5a5');
    if (this.hp <= 0) {
      this.dead = true;
      game.score += this.scoreValue;
      game.sound.play('death');
      game.trySpawnPower(this.x);
    } else {
      game.sound.play('hit');
    }
  }

  draw(cameraX) {
    const sx = this.x - cameraX;
    const bob = Math.sin(this.pulse) * 2;
    ctx.fillStyle = this.elite ? '#991b1b' : this.color;
    ctx.fillRect(sx - this.width * 0.5, this.y - this.height + bob, this.width, this.height);
    ctx.fillStyle = '#111827';
    ctx.fillRect(sx - 6, this.y - this.height + 16 + bob, 12, 12);
    ctx.fillStyle = '#fecaca';
    ctx.fillRect(sx - this.width * 0.5, this.y - this.height - 4 + bob, this.width * (this.hp / this.maxHp), 4);
  }
}

class BossEnemy extends Enemy {
  constructor(opts) {
    super({ ...opts, elite: true });
    this.width = 76;
    this.height = 112;
    this.cooldown = 0.8;
    this.volley = 3;
  }

  update(dt, player) {
    this.pulse += dt * 4;
    this.cooldown -= dt;

    const dist = player.x - this.x;
    if (Math.abs(dist) > 280) this.x += Math.sign(dist) * this.speed * dt;

    if (this.cooldown <= 0 && Math.abs(dist) < 820) {
      this.cooldown = this.fireRate;
      for (let i = 0; i < this.volley; i++) {
        const spread = (i - (this.volley - 1) / 2) * 0.14;
        const sx = this.x + Math.sign(dist) * 28;
        const sy = this.y - this.height * 0.78;
        const angle = Math.atan2((player.y - player.height * 0.7) - sy, player.x - sx) + spread;
        game.enemyProjectiles.push(new Projectile(
          sx,
          sy,
          Math.cos(angle) * this.projectileSpeed,
          Math.sin(angle) * this.projectileSpeed,
          this.damage,
          'enemy'
        ));
      }
    }
  }

  draw(cameraX) {
    const sx = this.x - cameraX;
    const bob = Math.sin(this.pulse) * 3;
    ctx.fillStyle = '#450a0a';
    ctx.fillRect(sx - this.width * 0.5, this.y - this.height + bob, this.width, this.height);
    ctx.fillStyle = '#f87171';
    ctx.fillRect(sx - this.width * 0.5, this.y - this.height - 8 + bob, this.width * (this.hp / this.maxHp), 6);
    ctx.fillStyle = '#fef2f2';
    ctx.font = 'bold 13px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillText('BOSS', sx, this.y - this.height - 14 + bob);
    ctx.textAlign = 'start';
  }
}

class Player {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = 80;
    this.y = GROUND_Y;
    this.width = 36;
    this.height = 64;
    this.vy = 0;
    this.speed = 260;
    this.health = 100;
    this.maxHealth = 100;
    this.power = 0;
    this.maxPower = 100;
    this.damage = 34;
    this.fireCd = 0;
    this.shieldTimer = 0;
    this.fireBoost = 0;
    this.speedBoost = 0;
    this.invuln = 0;
    this.facing = 1;
    this.onGround = true;
    this.secondaryCd = 0;
  }

  update(dt) {
    let move = 0;
    if (keys.ArrowLeft || keys.KeyA) move -= 1;
    if (keys.ArrowRight || keys.KeyD) move += 1;

    const speedMult = this.speedBoost > 0 ? 1.45 : 1;
    this.x += move * this.speed * speedMult * dt;
    this.x = Math.max(0, Math.min(this.x, game.levelManager.current.distance));
    if (move !== 0) this.facing = move;

    if ((keys.ArrowUp || keys.KeyW) && this.onGround) {
      this.vy = -760;
      this.onGround = false;
    }

    this.vy += GRAVITY * dt;
    this.y += this.vy * dt;
    if (this.y >= GROUND_Y) {
      this.y = GROUND_Y;
      this.vy = 0;
      this.onGround = true;
    }

    this.fireCd = Math.max(0, this.fireCd - dt);
    this.secondaryCd = Math.max(0, this.secondaryCd - dt);
    this.shieldTimer = Math.max(0, this.shieldTimer - dt);
    this.fireBoost = Math.max(0, this.fireBoost - dt);
    this.speedBoost = Math.max(0, this.speedBoost - dt);
    this.invuln = Math.max(0, this.invuln - dt);

    if ((keys.Space || keys.KeyJ) && this.fireCd === 0) {
      this.shoot();
    }

    if ((keys.KeyK || keys.ShiftLeft || keys.ShiftRight) && this.secondaryCd === 0 && this.power >= 30) {
      this.useSecondary();
    }
  }

  shoot() {
    const rate = this.fireBoost > 0 ? 0.17 : 0.3;
    this.fireCd = rate;
    const speed = 640;
    const sx = this.x + this.facing * 18;
    const sy = this.y - this.height * 0.62;
    game.playerProjectiles.push(new Projectile(sx, sy, this.facing * speed, -18, this.damage, 'player'));
    this.power = Math.min(this.maxPower, this.power + 3);
    game.sound.play('shoot');
  }

  useSecondary() {
    this.power = Math.max(0, this.power - 30);
    this.speedBoost = 1.8;
    this.shieldTimer = Math.max(this.shieldTimer, 1.2);
    this.invuln = Math.max(this.invuln, 0.5);
    this.secondaryCd = 1.5;
    game.spawnText(this.x, this.y - this.height - 10, 'Power Dash!', '#a5f3fc');
    game.sound.play('pickup');
  }

  takeDamage(dmg) {
    if (this.invuln > 0) return;
    if (this.shieldTimer > 0) {
      dmg = Math.round(dmg * 0.35);
    }
    this.health -= dmg;
    this.invuln = 0.2;
    game.spawnText(this.x, this.y - this.height - 14, `-${dmg} HP`, '#fecaca');
    game.sound.play('hit');
  }

  draw(cameraX) {
    const sx = this.x - cameraX;
    const blink = this.invuln > 0 && Math.floor(this.invuln * 30) % 2 === 0;
    if (blink) return;

    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(sx - this.width * 0.5, this.y - this.height, this.width, this.height);

    ctx.fillStyle = '#dbeafe';
    ctx.fillRect(sx - 8, this.y - this.height + 12, 16, 12);

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(sx + this.facing * 8, this.y - this.height * 0.58, 14, -Math.PI * 0.5, Math.PI * 0.5, this.facing < 0);
    ctx.stroke();

    if (this.shieldTimer > 0) {
      ctx.strokeStyle = 'rgba(56,189,248,0.7)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sx, this.y - this.height * 0.5, 34 + Math.sin(performance.now() / 120) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

class LevelManager {
  constructor() {
    this.levels = [
      { distance: 1800, enemyCount: 8, enemyHp: 42, enemySpeed: 72, fireRate: 2.2, projectileSpeed: 280, accuracy: 55, damage: 8, powerDropRate: 0.45, eliteEvery: 0, intro: 'Level 1: Outskirts Patrol' },
      { distance: 2300, enemyCount: 11, enemyHp: 50, enemySpeed: 88, fireRate: 1.9, projectileSpeed: 315, accuracy: 45, damage: 9, powerDropRate: 0.42, eliteEvery: 5, intro: 'Level 2: Canyon Ambush' },
      { distance: 2800, enemyCount: 14, enemyHp: 58, enemySpeed: 108, fireRate: 1.65, projectileSpeed: 350, accuracy: 35, damage: 11, powerDropRate: 0.4, eliteEvery: 4, intro: 'Level 3: Ruined Gate' },
      { distance: 3400, enemyCount: 18, enemyHp: 66, enemySpeed: 124, fireRate: 1.45, projectileSpeed: 390, accuracy: 26, damage: 12, powerDropRate: 0.38, eliteEvery: 3, intro: 'Level 4: Siege Road' },
      { distance: 4000, enemyCount: 22, enemyHp: 78, enemySpeed: 140, fireRate: 1.25, projectileSpeed: 425, accuracy: 20, damage: 13, powerDropRate: 0.36, eliteEvery: 2, boss: true, intro: 'Level 5: Fortress Core (Boss)' }
    ];
    this.index = 0;
    this.current = this.levels[0];
    this.spawned = 0;
    this.spawnTimer = 1;
  }

  reset() {
    this.index = 0;
    this.current = this.levels[0];
    this.spawned = 0;
    this.spawnTimer = 1;
  }

  beginLevel(index) {
    this.index = index;
    this.current = this.levels[index];
    this.spawned = 0;
    this.spawnTimer = 0.8;
  }

  update(dt) {
    this.spawnTimer -= dt;
    if (this.spawned >= this.current.enemyCount) return;
    if (this.spawnTimer <= 0) {
      this.spawnEnemy();
      const intensity = 1 + this.index * 0.18;
      this.spawnTimer = Math.max(0.45, (1.3 + Math.random() * 0.9) / intensity);
    }
  }

  spawnEnemy() {
    const level = this.current;
    const side = Math.random() < 0.5 ? -1 : 1;
    const spread = 260 + Math.random() * 560;
    const spawnX = Math.max(80, Math.min(level.distance - 80, game.player.x + side * spread));
    const elite = level.eliteEvery > 0 && this.spawned > 0 && this.spawned % level.eliteEvery === 0;

    if (level.boss && this.spawned === level.enemyCount - 1) {
      game.enemies.push(new BossEnemy({
        x: Math.max(game.player.x + 480, level.distance - 320),
        hp: 420,
        speed: level.enemySpeed * 0.8,
        fireRate: 1,
        projectileSpeed: level.projectileSpeed,
        damage: 18,
        accuracy: 8,
        side,
        scoreValue: 900
      }));
    } else {
      game.enemies.push(new Enemy({
        x: spawnX,
        hp: level.enemyHp + (elite ? 20 : 0),
        speed: level.enemySpeed + (elite ? 28 : 0),
        fireRate: Math.max(0.85, level.fireRate - (elite ? 0.25 : 0)),
        projectileSpeed: level.projectileSpeed + (elite ? 35 : 0),
        damage: level.damage + (elite ? 2 : 0),
        accuracy: Math.max(6, level.accuracy - (elite ? 10 : 0)),
        side,
        elite,
        scoreValue: elite ? 220 : 100,
        color: side === -1 ? '#7f1d1d' : '#881337'
      }));
    }

    this.spawned += 1;
  }
}

class UIManager {
  showOverlay({ title, message, buttons = {}, showControls = false }) {
    overlay.classList.remove('hidden');
    overlayTitle.textContent = title;
    overlayMessage.textContent = message;
    controlHelp.classList.toggle('hidden', !showControls);
    if (showControls) {
      controlHelp.innerHTML = [
        'Move: A/D or ←/→',
        'Jump/Dodge: W or ↑',
        'Shoot Arrow: J or Space',
        'Secondary Power: K or Shift (costs 30 power)',
        'Pause: P'
      ].join('<br/>');
    }

    const cfg = {
      startBtn: false,
      instructionsBtn: false,
      resumeBtn: false,
      nextBtn: false,
      restartBtn: false,
      menuBtn: false,
      ...buttons
    };

    startBtn.classList.toggle('hidden', !cfg.startBtn);
    instructionsBtn.classList.toggle('hidden', !cfg.instructionsBtn);
    resumeBtn.classList.toggle('hidden', !cfg.resumeBtn);
    nextBtn.classList.toggle('hidden', !cfg.nextBtn);
    restartBtn.classList.toggle('hidden', !cfg.restartBtn);
    menuBtn.classList.toggle('hidden', !cfg.menuBtn);

    hud.classList.add('hidden');
  }

  hideOverlay() {
    overlay.classList.add('hidden');
    hud.classList.remove('hidden');
  }

  updateHUD() {
    const p = game.player;
    healthFill.style.width = `${Math.max(0, (p.health / p.maxHealth) * 100)}%`;
    powerFill.style.width = `${Math.max(0, (p.power / p.maxPower) * 100)}%`;
    levelText.textContent = `Level ${game.levelManager.index + 1}`;
    scoreText.textContent = `Score: ${game.score}`;
    enemyText.textContent = `Enemies: ${Math.max(0, game.levelManager.current.enemyCount - game.kills)} left`;
    const prog = Math.min(100, Math.round((game.player.x / game.levelManager.current.distance) * 100));
    progressText.textContent = `Progress: ${prog}%`;
  }
}

class Game {
  constructor() {
    this.sound = new SoundManager();
    this.ui = new UIManager();
    this.levelManager = new LevelManager();
    this.player = new Player();
    this.state = 'menu';
    this.lastTime = 0;
    this.cameraX = 0;
    this.score = 0;
    this.kills = 0;

    this.enemies = [];
    this.playerProjectiles = [];
    this.enemyProjectiles = [];
    this.powerUps = [];
    this.texts = [];

    this.bindEvents();
    this.showMenu();
    requestAnimationFrame((t) => this.loop(t));
  }

  bindEvents() {
    window.addEventListener('keydown', (e) => {
      keys[e.code] = true;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space'].includes(e.code)) e.preventDefault();
      if (e.code === 'KeyP') this.togglePause();
    });

    window.addEventListener('keyup', (e) => {
      keys[e.code] = false;
    });

    startBtn.addEventListener('click', () => {
      this.sound.unlock();
      if (this.state === 'menu' || this.state === 'instructions') {
        this.startCampaign();
      }
    });

    instructionsBtn.addEventListener('click', () => {
      this.sound.unlock();
      this.state = 'instructions';
      this.ui.showOverlay({
        title: 'Instructions',
        message: 'Collect 20/30/100 powers, defeat threats from both sides, and reach the flag alive.',
        buttons: { startBtn: true, menuBtn: true },
        showControls: true
      });
      startBtn.textContent = 'Start Campaign';
    });

    resumeBtn.addEventListener('click', () => {
      this.sound.unlock();
      this.resumePlay();
    });

    nextBtn.addEventListener('click', () => {
      this.sound.unlock();
      this.startLevel(this.levelManager.index + 1);
    });

    restartBtn.addEventListener('click', () => {
      this.sound.unlock();
      this.startCampaign();
    });

    menuBtn.addEventListener('click', () => this.showMenu());
  }

  showMenu() {
    this.state = 'menu';
    this.ui.showOverlay({
      title: "Archer's Path",
      message: 'Travel across dangerous roads, fight villains, and survive all 5 levels.',
      buttons: { startBtn: true, instructionsBtn: true },
      showControls: false
    });
    startBtn.textContent = 'Start Game';
  }

  startCampaign() {
    this.score = 0;
    this.startLevel(0);
  }

  startLevel(index) {
    if (index >= this.levelManager.levels.length) {
      this.finalVictory();
      return;
    }

    this.levelManager.beginLevel(index);
    this.player.reset();
    this.player.power = Math.min(35, this.player.power);

    this.enemies = [];
    this.playerProjectiles = [];
    this.enemyProjectiles = [];
    this.powerUps = [];
    this.texts = [];
    this.kills = 0;
    this.cameraX = 0;

    this.state = 'levelIntro';
    this.ui.showOverlay({
      title: `Level ${index + 1}`,
      message: this.levelManager.current.intro,
      buttons: { resumeBtn: true, menuBtn: true },
      showControls: true
    });
    resumeBtn.textContent = 'Begin Level';
  }

  resumePlay() {
    this.state = 'playing';
    this.ui.hideOverlay();
  }

  togglePause() {
    if (this.state === 'playing') {
      this.state = 'paused';
      this.ui.showOverlay({
        title: 'Paused',
        message: 'Take a breath, then resume the battle.',
        buttons: { resumeBtn: true, menuBtn: true },
        showControls: false
      });
      resumeBtn.textContent = 'Resume';
    } else if (this.state === 'paused') {
      this.resumePlay();
    }
  }

  gameOver() {
    this.state = 'gameOver';
    this.ui.showOverlay({
      title: 'Game Over',
      message: 'The hero has fallen. Try again and manage power better.',
      buttons: { restartBtn: true, menuBtn: true },
      showControls: false
    });
  }

  levelComplete() {
    this.state = 'levelComplete';
    this.sound.play('victory');
    const last = this.levelManager.index === this.levelManager.levels.length - 1;
    if (last) {
      this.finalVictory();
      return;
    }

    this.ui.showOverlay({
      title: 'Level Complete',
      message: `You reached the destination! Score: ${this.score}`,
      buttons: { nextBtn: true, menuBtn: true },
      showControls: false
    });
  }

  finalVictory() {
    this.state = 'victory';
    this.sound.play('victory');
    this.ui.showOverlay({
      title: 'Final Victory',
      message: `All routes cleared! Final Score: ${this.score}`,
      buttons: { restartBtn: true, menuBtn: true },
      showControls: false
    });
  }

  spawnText(x, y, text, color = '#fff') {
    this.texts.push({ x, y, text, color, life: 1.1 });
  }

  trySpawnPower(x) {
    const dropChance = this.levelManager.current.powerDropRate;
    if (Math.random() > dropChance) return;
    const roll = Math.random();
    const value = roll < 0.5 ? 20 : roll < 0.85 ? 30 : 100;
    this.powerUps.push(new PowerUp(x, GROUND_Y - 34, value));
  }

  update(dt) {
    this.levelManager.update(dt);
    this.player.update(dt);

    for (const e of this.enemies) e.update(dt, this.player);
    for (const p of this.playerProjectiles) p.update(dt);
    for (const p of this.enemyProjectiles) p.update(dt);
    for (const p of this.powerUps) p.update(dt);

    this.handleCollisions();
    this.cleanup();

    for (const t of this.texts) {
      t.life -= dt;
      t.y -= dt * 34;
    }

    const halfW = canvas.width * 0.5;
    this.cameraX = Math.max(0, Math.min(this.player.x - halfW, this.levelManager.current.distance - canvas.width + 120));

    this.ui.updateHUD();

    if (this.player.health <= 0) this.gameOver();
    if (this.player.x >= this.levelManager.current.distance - 30 && this.state === 'playing') this.levelComplete();
  }

  handleCollisions() {
    const p = this.player;
    const playerBox = {
      x: p.x - p.width * 0.5,
      y: p.y - p.height,
      w: p.width,
      h: p.height
    };

    for (const arrow of this.playerProjectiles) {
      for (const enemy of this.enemies) {
        if (enemy.dead || arrow.dead) continue;
        if (rectContains(enemy, arrow.x, arrow.y)) {
          enemy.hit(this.player.damage);
          arrow.dead = true;
          if (enemy.dead) this.kills += 1;
        }
      }
    }

    for (const arrow of this.enemyProjectiles) {
      if (arrow.dead) continue;
      if (pointInRect(arrow.x, arrow.y, playerBox)) {
        p.takeDamage(arrow.damage);
        arrow.dead = true;
      }
    }

    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      if (rectOverlap(playerBox, {
        x: enemy.x - enemy.width * 0.5,
        y: enemy.y - enemy.height,
        w: enemy.width,
        h: enemy.height
      })) {
        p.takeDamage(14);
      }
    }

    for (const power of this.powerUps) {
      if (power.dead) continue;
      const dx = power.x - p.x;
      const dy = power.y - (p.y - p.height * 0.55);
      if (Math.hypot(dx, dy) < power.radius + 24) {
        power.apply(p);
      }
    }
  }

  cleanup() {
    this.enemies = this.enemies.filter((e) => !e.dead);
    this.playerProjectiles = this.playerProjectiles.filter((p) => !p.dead);
    this.enemyProjectiles = this.enemyProjectiles.filter((p) => !p.dead);
    this.powerUps = this.powerUps.filter((p) => !p.dead);
    this.texts = this.texts.filter((t) => t.life > 0);
  }

  render() {
    const level = this.levelManager.current;
    const cameraX = this.cameraX;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.drawBackground(level, cameraX);

    const flagX = level.distance - cameraX;
    ctx.fillStyle = '#111827';
    ctx.fillRect(flagX, GROUND_Y - 90, 6, 90);
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.moveTo(flagX + 6, GROUND_Y - 88);
    ctx.lineTo(flagX + 48, GROUND_Y - 72);
    ctx.lineTo(flagX + 6, GROUND_Y - 56);
    ctx.fill();

    for (const power of this.powerUps) power.draw(cameraX);
    for (const enemy of this.enemies) enemy.draw(cameraX);
    for (const arrow of this.playerProjectiles) arrow.draw(cameraX);
    for (const arrow of this.enemyProjectiles) arrow.draw(cameraX);
    this.player.draw(cameraX);

    for (const t of this.texts) {
      ctx.globalAlpha = Math.max(0, t.life);
      ctx.fillStyle = t.color;
      ctx.font = 'bold 15px Segoe UI';
      ctx.textAlign = 'center';
      ctx.fillText(t.text, t.x - cameraX, t.y);
      ctx.textAlign = 'start';
      ctx.globalAlpha = 1;
    }
  }

  drawBackground(level, cameraX) {
    ctx.fillStyle = '#93c5fd';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 7; i++) {
      const mx = (i * 300 - cameraX * 0.23) % 2100;
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(mx, GROUND_Y + 6);
      ctx.lineTo(mx + 160, GROUND_Y - 150);
      ctx.lineTo(mx + 330, GROUND_Y + 6);
      ctx.fill();
    }

    for (let i = 0; i < 24; i++) {
      const tx = (i * 170 - cameraX * 0.6) % 4200;
      ctx.fillStyle = i % 2 ? '#14532d' : '#166534';
      ctx.fillRect(tx, GROUND_Y - 64, 18, 64);
      ctx.beginPath();
      ctx.arc(tx + 9, GROUND_Y - 74, 24, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#365314';
    ctx.fillRect(0, GROUND_Y, canvas.width, canvas.height - GROUND_Y);

    for (let i = 0; i < 50; i++) {
      const ox = (i * 110 - cameraX * 0.9) % (level.distance + 300);
      ctx.fillStyle = i % 3 ? '#475569' : '#3f3f46';
      ctx.fillRect(ox, GROUND_Y - 8, 18, 8);
    }
  }

  loop(ts) {
    const dt = Math.min(0.033, (ts - this.lastTime) / 1000 || 0.016);
    this.lastTime = ts;

    if (this.state === 'playing') {
      this.update(dt);
    }

    this.render();
    requestAnimationFrame((t) => this.loop(t));
  }
}

function rectContains(entity, x, y) {
  return (
    x >= entity.x - entity.width * 0.5 &&
    x <= entity.x + entity.width * 0.5 &&
    y >= entity.y - entity.height &&
    y <= entity.y
  );
}

function pointInRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function rectOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

const game = new Game();
