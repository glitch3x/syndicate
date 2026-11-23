// Game Loop, Input Controller, Wave Director, and Canvas Engine for THE SYNDICATE

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');

    this.state = 'MENU'; // MENU, PLAYING, PAUSED, GAME_OVER, VICTORY
    this.isEndless = false;
    this.selectedCharacter = 'rx7'; // 'rx7', 'nova', 'reaper'
    this.viewMode = 'third_person'; // 'third_person' or 'first_person'

    // Dimensions
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.bounds = { minX: 40, maxX: this.width - 40, minY: 40, maxY: this.height - 40 };

    // Entities
    this.player = null;
    this.projectiles = [];
    this.enemies = [];
    this.particles = [];
    this.ghosts = [];
    this.pickups = [];
    this.boss = null;

    // Input state
    this.keys = {};
    this.mouse = { x: this.width / 2, y: this.height / 2, down: false, right: false };

    // Stats & Progression
    this.score = 0;
    this.kills = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.comboTimer = 0;
    this.gameTime = 0;
    this.sector = 1; // 1: Street, 2: Firewall, 3: Boss Titan

    // Sector & Wave timers
    this.waveTimer = 0;
    this.spawnTimer = 0;
    this.waveKills = 0;
    this.requiredKillsSector1 = 18;
    this.requiredKillsSector2 = 25;

    // Screen Shake
    this.shakeIntensity = 0;
    this.shakeDecay = 0.9;

    // Background ambiance
    this.rainDrops = [];
    this.initBackgroundEffects();

    // Timing
    this.lastTime = performance.now();

    this.bindEvents();
    this.resize();
  }

  initBackgroundEffects() {
    this.rainDrops = [];
    for (let i = 0; i < 70; i++) {
      this.rainDrops.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        len: Math.random() * 20 + 10,
        speed: Math.random() * 8 + 8,
        color: Math.random() < 0.2 ? '#00ff66' : 'rgba(0, 243, 255, 0.4)'
      });
    }
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.bounds = { minX: 30, maxX: this.width - 30, minY: 30, maxY: this.height - 30 };
    if (this.player) {
      this.player.x = Math.min(this.player.x, this.bounds.maxX);
      this.player.y = Math.min(this.player.y, this.bounds.maxY);
    }
  }

  bindEvents() {
    window.addEventListener('resize', () => this.resize());

    // Keyboard
    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (e.code === 'Digit1' && this.player) this.player.activeWeaponIndex = 0;
      if (e.code === 'Digit2' && this.player) this.player.activeWeaponIndex = 1;
      if (e.code === 'Digit3' && this.player) this.player.activeWeaponIndex = 2;
      // Quick test hotkeys: [9] test Syndicate ending, [0] test Boss encounter
      if (e.code === 'Digit9') {
        this.triggerVictory();
      }
      if (e.code === 'Digit0') {
        this.sector = 3;
        this.waveKills = 0;
        this.showFloatingAnnouncement('DEBUG: BOSS SECTOR', '#ff0033');
        if (window.gameAudio) {
          window.gameAudio.playBossSiren();
          window.gameAudio.playMusic('boss');
        }
        this.enemies = [];
        this.boss = new BossCoreTitan(this.width / 2, 120);
        this.enemies.push(this.boss);
      }
      if (e.code === 'KeyV') {
        this.toggleViewMode();
      }
      if (e.code === 'KeyQ' || e.code === 'KeyE') {
        if (this.player && this.state === 'PLAYING') {
          this.player.useEmp(this.projectiles, this.enemies, this.particles);
          this.triggerScreenShake(8);
        }
      }
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (this.state === 'PLAYING') this.pauseGame();
        else if (this.state === 'PAUSED') this.resumeGame();
      }
      if (e.code === 'KeyM') {
        if (window.gameAudio) {
          const isMuted = window.gameAudio.toggleMute();
          const btn = document.getElementById('mute-btn');
          if (btn) btn.textContent = isMuted ? '🔇 SOUND OFF' : '🔊 SOUND ON';
        }
      }
    });

    window.addEventListener('keyup', e => {
      this.keys[e.code] = false;
    });

    // Mouse
    window.addEventListener('mousemove', e => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });

    window.addEventListener('mousedown', e => {
      if (e.button === 0) this.mouse.down = true;
      if (e.button === 2) {
        this.mouse.right = true;
        e.preventDefault();
      }
    });

    window.addEventListener('mouseup', e => {
      if (e.button === 0) this.mouse.down = false;
      if (e.button === 2) this.mouse.right = false;
    });

    window.addEventListener('contextmenu', e => e.preventDefault());

    // Scroll wheel for weapons
    window.addEventListener('wheel', e => {
      if (!this.player) return;
      if (e.deltaY > 0) {
        this.player.activeWeaponIndex = (this.player.activeWeaponIndex + 1) % this.player.weapons.length;
      } else {
        this.player.activeWeaponIndex = (this.player.activeWeaponIndex - 1 + this.player.weapons.length) % this.player.weapons.length;
      }
    });

    // Touch controls for mobile
    this.setupTouchControls();
  }

  setupTouchControls() {
    const joyStickZone = document.getElementById('touch-joystick-zone');
    const joyStickKnob = document.getElementById('touch-joystick-knob');
    if (!joyStickZone || !joyStickKnob) return;

    let touchId = null;
    let originX = 0, originY = 0;

    joyStickZone.addEventListener('touchstart', e => {
      const t = e.changedTouches[0];
      touchId = t.identifier;
      const rect = joyStickZone.getBoundingClientRect();
      originX = rect.left + rect.width / 2;
      originY = rect.top + rect.height / 2;
      e.preventDefault();
    }, { passive: false });

    joyStickZone.addEventListener('touchmove', e => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === touchId) {
          let dx = t.clientX - originX;
          let dy = t.clientY - originY;
          const dist = Math.hypot(dx, dy);
          const maxR = 40;
          if (dist > maxR) {
            dx = (dx / dist) * maxR;
            dy = (dy / dist) * maxR;
          }
          joyStickKnob.style.transform = `translate(${dx}px, ${dy}px)`;

          // Apply to keys
          this.keys['KeyW'] = dy < -10;
          this.keys['KeyS'] = dy > 10;
          this.keys['KeyA'] = dx < -10;
          this.keys['KeyD'] = dx > 10;
          e.preventDefault();
          break;
        }
      }
    }, { passive: false });

    const resetJoystick = () => {
      touchId = null;
      joyStickKnob.style.transform = `translate(0px, 0px)`;
      this.keys['KeyW'] = false;
      this.keys['KeyS'] = false;
      this.keys['KeyA'] = false;
      this.keys['KeyD'] = false;
    };

    joyStickZone.addEventListener('touchend', resetJoystick);
    joyStickZone.addEventListener('touchcancel', resetJoystick);

    // Mobile action buttons
    const btnFire = document.getElementById('touch-btn-fire');
    const btnDash = document.getElementById('touch-btn-dash');
    const btnEmp = document.getElementById('touch-btn-emp');
    const btnWep = document.getElementById('touch-btn-weapon');

    if (btnFire) {
      btnFire.addEventListener('touchstart', e => { this.mouse.down = true; e.preventDefault(); });
      btnFire.addEventListener('touchend', e => { this.mouse.down = false; e.preventDefault(); });
    }
    if (btnDash) {
      btnDash.addEventListener('touchstart', e => {
        if (this.player) this.keys['Space'] = true;
        setTimeout(() => this.keys['Space'] = false, 150);
        e.preventDefault();
      });
    }
    if (btnEmp) {
      btnEmp.addEventListener('touchstart', e => {
        if (this.player && this.state === 'PLAYING') {
          this.player.useEmp(this.projectiles, this.enemies, this.particles);
          this.triggerScreenShake(8);
        }
        e.preventDefault();
      });
    }
    if (btnWep) {
      btnWep.addEventListener('touchstart', e => {
        if (this.player) {
          this.player.activeWeaponIndex = (this.player.activeWeaponIndex + 1) % this.player.weapons.length;
        }
        e.preventDefault();
      });
    }
  }

  selectCharacter(charId) {
    this.selectedCharacter = charId;
    document.querySelectorAll('.char-card').forEach(c => {
      if (c.dataset.char === charId) c.classList.add('active');
      else c.classList.remove('active');
    });
    if (this.player) {
      this.player.setCharacter(charId);
    }
  }

  startMission(endless = false) {
    this.isEndless = endless;
    this.state = 'PLAYING';
    this.score = 0;
    this.kills = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.comboTimer = 0;
    this.gameTime = 0;
    this.sector = endless ? 99 : 1;
    this.waveKills = 0;
    this.waveTimer = 0;
    this.spawnTimer = 0;
    this.boss = null;

    // Reset entities
    this.projectiles = [];
    this.enemies = [];
    this.particles = [];
    this.ghosts = [];
    this.pickups = [];

    // Create 2D player at center with selected character
    this.player = new Player(this.width / 2, this.height / 2, this.selectedCharacter);

    // Update HUD avatar and name
    const def = this.player.charDefs[this.selectedCharacter] || this.player.charDefs.rx7;
    const avatarEl = document.getElementById('hud-avatar-img');
    const nameEl = document.getElementById('hud-player-name');
    if (avatarEl) avatarEl.src = def.badgeSrc;
    if (nameEl) nameEl.textContent = def.name;

    // Start Combat Music
    if (window.gameAudio) {
      window.gameAudio.ensureReady();
      window.gameAudio.playMusic('combat');
    }

    // UI visibility
    document.getElementById('title-screen').style.display = 'none';
    document.getElementById('game-over-screen').style.display = 'none';
    document.getElementById('ending-screen').classList.add('hidden');
    document.getElementById('hud').style.display = 'flex';

    this.showFloatingAnnouncement(endless ? 'ENDLESS REBELLION ACTIVATED' : 'SECTOR 1: PERIMETER GRID');
  }

  toggleViewMode() {
    this.viewMode = this.viewMode === 'third_person' ? 'first_person' : 'third_person';
    const btn = document.getElementById('view-toggle-btn');
    if (btn) btn.textContent = this.viewMode === 'third_person' ? '📷 2D SURVIVOR' : '🎯 2D ARCADE GUN';
    this.showFloatingAnnouncement(this.viewMode === 'third_person' ? '2D SURVIVOR VIEW' : '2D FIRST-PERSON GUN', '#00f3ff');
  }

  pauseGame() {
    this.state = 'PAUSED';
    document.getElementById('pause-modal').style.display = 'flex';
  }

  resumeGame() {
    this.state = 'PLAYING';
    document.getElementById('pause-modal').style.display = 'none';
  }

  triggerScreenShake(intensity = 6) {
    this.shakeIntensity = Math.min(25, this.shakeIntensity + intensity);
  }

  showFloatingAnnouncement(text, color = '#00ff66') {
    const el = document.getElementById('announcement-banner');
    if (!el) return;
    el.textContent = text;
    el.style.color = color;
    el.style.textShadow = `0 0 15px ${color}`;
    el.style.opacity = '1';
    el.style.transform = 'translate(-50%, -50%) scale(1.1)';
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translate(-50%, -50%) scale(0.9)';
    }, 1800);
  }

  // ===================== WAVE & SPAWN DIRECTOR ===================== //

  updateDirector(dt) {
    if (this.state !== 'PLAYING') return;

    this.spawnTimer -= dt;
    this.waveTimer += dt;

    // Periodically spawn Syndicate airdrops
    if (Math.random() < 0.003 && this.pickups.length < 5) {
      this.spawnSyndicateAirdrop();
    }

    if (this.isEndless) {
      // Scaling continuous waves
      const spawnInterval = Math.max(0.4, 1.8 - (this.gameTime / 120));
      if (this.spawnTimer <= 0) {
        this.spawnTimer = spawnInterval;
        this.spawnRandomEnemy();
      }
      return;
    }

    // Story Mission Progression
    if (this.sector === 1) {
      // Sector 1: Perimeter Grid
      if (this.spawnTimer <= 0 && this.enemies.length < 12) {
        this.spawnTimer = 1.6;
        if (Math.random() < 0.6) this.spawnEnemyAtEdge('drone');
        else this.spawnEnemyAtEdge('hound');
      }

      if (this.waveKills >= this.requiredKillsSector1) {
        this.sector = 2;
        this.waveKills = 0;
        this.showFloatingAnnouncement('SECTOR 2: FIREWALL NEXUS', '#ffaa00');
        // Spawn reward pickup
        this.pickups.push(new Pickup(this.width / 2, this.height / 2, 'scatterAmmo'));
        this.pickups.push(new Pickup(this.width / 2 + 30, this.height / 2, 'heal'));
      }
    } else if (this.sector === 2) {
      // Sector 2: Firewall Nexus
      if (this.spawnTimer <= 0 && this.enemies.length < 14) {
        this.spawnTimer = 1.3;
        const r = Math.random();
        if (r < 0.4) this.spawnEnemyAtEdge('android');
        else if (r < 0.75) this.spawnEnemyAtEdge('drone');
        else this.spawnEnemyAtEdge('heavy');
      }

      if (this.waveKills >= this.requiredKillsSector2) {
        this.sector = 3;
        this.waveKills = 0;
        this.showFloatingAnnouncement('WARNING: CORE-TITAN INCOMING', '#ff0033');
        if (window.gameAudio) {
          window.gameAudio.playBossSiren();
          window.gameAudio.playMusic('boss');
        }
        // Wipe regular enemies and spawn Boss
        this.enemies = [];
        this.boss = new BossCoreTitan(this.width / 2, 100);
        this.enemies.push(this.boss);
        this.triggerScreenShake(15);
      }
    } else if (this.sector === 3) {
      // Sector 3: Boss Encounter
      // Boss occasionally spawns escort drones
      if (this.boss && this.boss.active) {
        if (this.spawnTimer <= 0 && this.enemies.length < 5) {
          this.spawnTimer = 4.0;
          this.spawnEnemyAtEdge('drone');
        }
      }
    }
  }

  spawnEnemyAtEdge(type) {
    const edge = Math.floor(Math.random() * 4);
    let x, y;
    if (edge === 0) { // Top
      x = Math.random() * this.width;
      y = -30;
    } else if (edge === 1) { // Bottom
      x = Math.random() * this.width;
      y = this.height + 30;
    } else if (edge === 2) { // Left
      x = -30;
      y = Math.random() * this.height;
    } else { // Right
      x = this.width + 30;
      y = Math.random() * this.height;
    }

    if (type === 'drone') this.enemies.push(new ScoutDrone(x, y));
    else if (type === 'hound') this.enemies.push(new CyberHound(x, y));
    else if (type === 'android') this.enemies.push(new EnforcerAndroid(x, y));
    else if (type === 'heavy') this.enemies.push(new HeavyMech(x, y));
  }

  spawnRandomEnemy() {
    const types = ['drone', 'hound', 'android', 'heavy'];
    const weights = [0.4, 0.3, 0.2, 0.1];
    const r = Math.random();
    let sum = 0;
    let chosen = 'drone';
    for (let i = 0; i < types.length; i++) {
      sum += weights[i];
      if (r <= sum) {
        chosen = types[i];
        break;
      }
    }
    this.spawnEnemyAtEdge(chosen);
  }

  spawnSyndicateAirdrop() {
    const x = Math.random() * (this.width - 200) + 100;
    const y = Math.random() * (this.height - 200) + 100;
    const types = ['heal', 'scatterAmmo', 'railgunAmmo', 'overdrive'];
    const type = types[Math.floor(Math.random() * types.length)];
    this.pickups.push(new Pickup(x, y, type));

    if (window.gameAudio) window.gameAudio.playPowerup();
    this.showFloatingAnnouncement('SYNDICATE AIRDROP DELIVERED', '#00f3ff');
  }

  // ===================== GAME UPDATE & PHYSICS ===================== //

  update(dt) {
    if (this.state !== 'PLAYING') return;

    this.gameTime += dt;

    // Screen Shake decay
    if (this.shakeIntensity > 0) {
      this.shakeIntensity *= this.shakeDecay;
      if (this.shakeIntensity < 0.2) this.shakeIntensity = 0;
    }

    // Combo timer decay
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 0;
      }
    }

    // Update Player
    if (this.player) {
      this.player.update(dt, this.keys, this.mouse, this.bounds, this.particles, this.ghosts);

      // Auto-fire or click fire
      if (this.mouse.down) {
        this.player.shoot(this.mouse, this.projectiles, this.particles);
      }

      // Check Player death
      if (this.player.hp <= 0) {
        this.gameOver();
        return;
      }
    }

    // Director & Spawning
    this.updateDirector(dt);

    // Update Dash Ghosts
    this.ghosts.forEach(g => g.update(dt));
    this.ghosts = this.ghosts.filter(g => g.life > 0);

    // Update Projectiles
    this.projectiles.forEach(p => p.update(dt, this.player, this.particles));
    this.projectiles = this.projectiles.filter(p => p.active);

    // Update Pickups
    this.pickups.forEach(p => p.update(dt, this.player));
    // Pickup collisions
    this.pickups.forEach(p => {
      if (!p.active) return;
      const dist = Math.hypot(p.x - this.player.x, p.y - this.player.y);
      if (dist < p.radius + this.player.radius) {
        p.active = false;
        if (p.type === 'heal') {
          this.player.hp = Math.min(this.player.maxHp, this.player.hp + 35);
        } else if (p.type === 'scatterAmmo') {
          this.player.weapons[1].ammo = Math.min(this.player.weapons[1].maxAmmo, this.player.weapons[1].ammo + 25);
        } else if (p.type === 'railgunAmmo') {
          this.player.weapons[2].ammo = Math.min(this.player.weapons[2].maxAmmo, this.player.weapons[2].ammo + 10);
        } else if (p.type === 'overdrive') {
          this.player.overdriveTime = 7.0;
        }
        if (window.gameAudio) window.gameAudio.playPowerup();
      }
    });
    this.pickups = this.pickups.filter(p => p.active);

    // Update Enemies
    this.enemies.forEach(e => e.update(dt, this.player, this.projectiles, this.particles));

    // Collision: Player Projectiles vs Enemies
    this.projectiles.forEach(p => {
      if (!p.active || !p.isPlayer) return;

      this.enemies.forEach(e => {
        if (!e.active || !p.active) return;
        if (p.hitEntities.has(e)) return;

        const dist = Math.hypot(p.x - e.x, p.y - e.y);
        if (dist < p.radius + e.radius) {
          p.hitEntities.add(e);
          e.takeDamage(p.damage, this.particles);

          if (p.type !== 'railgun') {
            p.active = false;
          }

          // Enemy defeated check
          if (!e.active) {
            this.onEnemyKilled(e);
          }
        }
      });
    });

    // Collision: Hostile Projectiles vs Player
    this.projectiles.forEach(p => {
      if (!p.active || p.isPlayer) return;

      const dist = Math.hypot(p.x - this.player.x, p.y - this.player.y);
      if (dist < p.radius + this.player.radius) {
        p.active = false;
        const dmgTaken = this.player.takeDamage(p.damage, this.particles);
        if (dmgTaken > 0) {
          this.triggerScreenShake(7);
        }
      }
    });

    // Remove dead enemies
    this.enemies = this.enemies.filter(e => e.active);

    // Update Particles
    this.particles.forEach(pt => pt.update(dt));
    this.particles = this.particles.filter(pt => pt.life > 0);

    // Check Boss victory condition
    if (this.sector === 3 && this.boss && !this.boss.active) {
      this.triggerVictory();
    }

    // Update HUD
    this.updateHud();
  }

  onEnemyKilled(enemy) {
    this.kills++;
    this.waveKills++;
    this.combo++;
    this.comboTimer = 3.5;
    this.maxCombo = Math.max(this.maxCombo, this.combo);

    const multiplier = Math.min(10, 1 + Math.floor(this.combo / 3));
    this.score += enemy.scoreValue * multiplier;

    // Chance to drop ammo or heal
    if (Math.random() < 0.25) {
      const dropType = Math.random() < 0.4 ? 'heal' : (Math.random() < 0.5 ? 'scatterAmmo' : 'railgunAmmo');
      this.pickups.push(new Pickup(enemy.x, enemy.y, dropType));
    }
  }

  triggerVictory() {
    this.state = 'VICTORY';
    this.triggerScreenShake(20);

    // Final explosions
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = Math.random() * 8 + 2;
      this.particles.push(new Particle(this.width / 2, this.height / 2, Math.cos(a) * spd, Math.sin(a) * spd, '#00ff66', 6, 1.2, 'spark'));
    }

    const stats = {
      score: this.score,
      kills: this.kills,
      maxCombo: this.maxCombo,
      time: this.gameTime,
      character: this.selectedCharacter
    };

    if (window.syndicateEnding) {
      window.syndicateEnding.triggerEnding(stats);
    }
  }

  gameOver() {
    this.state = 'GAME_OVER';
    if (window.gameAudio) window.gameAudio.stopMusic();

    document.getElementById('hud').style.display = 'none';
    document.getElementById('game-over-screen').style.display = 'flex';
    document.getElementById('final-score').textContent = this.score.toLocaleString();
    document.getElementById('final-kills').textContent = this.kills;
  }

  // ===================== HUD & RADAR ===================== //

  updateHud() {
    if (!this.player) return;

    // HP & Shield
    const hpBar = document.getElementById('hp-fill');
    const shieldBar = document.getElementById('shield-fill');
    const hpText = document.getElementById('hp-text');

    if (hpBar) hpBar.style.width = `${(this.player.hp / this.player.maxHp) * 100}%`;
    if (shieldBar) shieldBar.style.width = `${(this.player.shield / this.player.maxShield) * 100}%`;
    if (hpText) hpText.textContent = `${Math.ceil(this.player.hp)} / ${this.player.maxHp}`;

    // Weapon UI
    const wepList = document.querySelectorAll('.wep-slot');
    wepList.forEach((slot, idx) => {
      if (idx === this.player.activeWeaponIndex) {
        slot.classList.add('active');
      } else {
        slot.classList.remove('active');
      }
      const ammoEl = slot.querySelector('.wep-ammo');
      if (ammoEl) {
        const wep = this.player.weapons[idx];
        ammoEl.textContent = wep.ammo === Infinity ? 'INF' : wep.ammo;
      }
    });

    // Score & Multiplier
    const scoreEl = document.getElementById('hud-score');
    const comboEl = document.getElementById('hud-combo');
    if (scoreEl) scoreEl.textContent = this.score.toLocaleString();
    if (comboEl) {
      const mult = Math.min(10, 1 + Math.floor(this.combo / 3));
      comboEl.textContent = `COMBO: x${mult} (${this.combo})`;
      comboEl.style.color = mult > 1 ? '#00ff66' : '#8899aa';
    }

    // EMP cooldown fill
    const empBar = document.getElementById('emp-cooldown-fill');
    if (empBar) {
      const pct = Math.max(0, 1 - (this.player.empTimer / this.player.empCooldown)) * 100;
      empBar.style.width = `${pct}%`;
    }

    // Boss Bar
    const bossHud = document.getElementById('boss-hud-bar');
    if (bossHud) {
      if (this.boss && this.boss.active) {
        bossHud.style.display = 'block';
        const bossFill = document.getElementById('boss-hp-fill');
        if (bossFill) {
          bossFill.style.width = `${(this.boss.hp / this.boss.maxHp) * 100}%`;
        }
      } else {
        bossHud.style.display = 'none';
      }
    }

    // Draw Radar
    this.drawRadar();
  }

  drawRadar() {
    const radarCanvas = document.getElementById('radar-canvas');
    if (!radarCanvas) return;
    const rCtx = radarCanvas.getContext('2d');
    const rw = radarCanvas.width;
    const rh = radarCanvas.height;

    rCtx.clearRect(0, 0, rw, rh);

    // Radar grid
    rCtx.strokeStyle = 'rgba(0, 243, 255, 0.2)';
    rCtx.lineWidth = 1;
    rCtx.beginPath();
    rCtx.arc(rw / 2, rh / 2, rw / 2 - 2, 0, Math.PI * 2);
    rCtx.stroke();

    // Map bounds ratio
    const scaleX = rw / this.width;
    const scaleY = rh / this.height;

    // Player blip (Cyan)
    if (this.player) {
      rCtx.fillStyle = '#00f3ff';
      rCtx.beginPath();
      rCtx.arc(this.player.x * scaleX, this.player.y * scaleY, 3, 0, Math.PI * 2);
      rCtx.fill();
    }

    // Pickups (Gold/Green)
    this.pickups.forEach(p => {
      rCtx.fillStyle = '#ffd700';
      rCtx.beginPath();
      rCtx.arc(p.x * scaleX, p.y * scaleY, 2.5, 0, Math.PI * 2);
      rCtx.fill();
    });

    // Enemies (Red)
    this.enemies.forEach(e => {
      rCtx.fillStyle = e.type === 'boss' ? '#ff0033' : '#ff4466';
      const r = e.type === 'boss' ? 5 : 2;
      rCtx.beginPath();
      rCtx.arc(e.x * scaleX, e.y * scaleY, r, 0, Math.PI * 2);
      rCtx.fill();
    });
  }

  // ===================== RENDER PIPELINE ===================== //

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.save();

    // Screen Shake Offset
    if (this.shakeIntensity > 0) {
      const ox = (Math.random() - 0.5) * this.shakeIntensity;
      const oy = (Math.random() - 0.5) * this.shakeIntensity;
      ctx.translate(ox, oy);
    }

    // 1. Cyberpunk Parallax Grid Background
    this.drawBackground(ctx);

    // 2. Dash Ghosts
    this.ghosts.forEach(g => g.draw(ctx));

    // 3. Pickups
    this.pickups.forEach(p => p.draw(ctx));

    // 4. Projectiles
    this.projectiles.forEach(p => p.draw(ctx));

    // 5. Enemies
    this.enemies.forEach(e => e.draw(ctx));

    // 6. Player
    if (this.player) this.player.draw(ctx, this.viewMode, this.mouse, this.width, this.height);

    // 7. Particles & Shockwaves
    this.particles.forEach(pt => pt.draw(ctx));

    // 8. Custom Reticle
    this.drawReticle(ctx);

    ctx.restore();
  }

  drawBackground(ctx) {
    // Deep dark synth gradient
    const grad = ctx.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, '#06080e');
    grad.addColorStop(1, '#0e121a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Cyber Grid
    ctx.strokeStyle = this.sector === 2 ? 'rgba(255, 80, 0, 0.08)' : (this.sector === 3 ? 'rgba(255, 0, 80, 0.12)' : 'rgba(0, 243, 255, 0.07)');
    ctx.lineWidth = 1;
    const gridSize = 60;
    const offsetX = (this.gameTime * 12) % gridSize;
    const offsetY = (this.gameTime * 12) % gridSize;

    ctx.beginPath();
    for (let x = offsetX; x < this.width; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
    }
    for (let y = offsetY; y < this.height; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
    }
    ctx.stroke();

    // Rain / Digital Embers
    this.rainDrops.forEach(r => {
      r.y += r.speed;
      if (r.y > this.height) {
        r.y = -20;
        r.x = Math.random() * this.width;
      }
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x - 2, r.y + r.len);
      ctx.stroke();
    });

    // Sector Title watermark in background
    ctx.save();
    ctx.font = 'bold 72px "Impact", "Arial Black", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.textAlign = 'center';
    const sectorWatermark = this.sector === 3 ? 'SYSTEM CORE // BREACH' : (this.sector === 2 ? 'FIREWALL // RESTRICTED' : 'SECTOR 09 // REBELLION');
    ctx.fillText(sectorWatermark, this.width / 2, this.height / 2 + 30);
    ctx.restore();
  }

  drawReticle(ctx) {
    if (this.state !== 'PLAYING') return;

    ctx.save();
    ctx.translate(this.mouse.x, this.mouse.y);

    const color = this.player && this.player.overdriveTime > 0 ? '#ff00ff' : '#00ff66';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;

    // Crosshair circle
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.stroke();

    // Ticks
    const len = 7;
    ctx.beginPath();
    ctx.moveTo(0, -14); ctx.lineTo(0, -14 - len);
    ctx.moveTo(0, 14);  ctx.lineTo(0, 14 + len);
    ctx.moveTo(-14, 0); ctx.lineTo(-14 - len, 0);
    ctx.moveTo(14, 0);  ctx.lineTo(14 + len, 0);
    ctx.stroke();

    // Center dot
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // ===================== MAIN LOOP ===================== //

  run() {
    const loop = (now) => {
      const dt = Math.min(0.1, (now - this.lastTime) / 1000);
      this.lastTime = now;

      this.update(dt);
      this.draw();

      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

// Global game instance
window.addEventListener('DOMContentLoaded', () => {
  window.syndicateGame = new Game();
  window.syndicateGame.run();
});
