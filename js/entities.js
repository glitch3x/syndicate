// 2D ARTICULATED CHARACTER ENGINE & DUAL-VIEW COMBAT SYSTEM
// Mode 1: Large 2D Survivor Hero (Inkblade Survivors / BattleDudes style)
// Mode 2: First-Person Cyberpunk Arcade Gun (SkillWarz / Doom style)

// ===================== PARTICLE SYSTEM ===================== //
class Particle {
  constructor(x, y, vx, vy, color, size, life, type = 'spark') {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.maxLife = life;
    this.life = life;
    this.type = type;
    this.alpha = 1;
    this.text = '';
  }

  update(dt) {
    this.life -= dt;
    this.alpha = Math.max(0, this.life / this.maxLife);
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;

    if (this.type === 'spark') {
      this.vx *= 0.94;
      this.vy *= 0.94;
    } else if (this.type === 'smoke') {
      this.vx *= 0.98;
      this.vy *= 0.98;
      this.size += dt * 14;
    } else if (this.type === 'damageText') {
      this.vy -= dt * 0.9;
    } else if (this.type === 'ring') {
      this.size += dt * 280;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.alpha;

    if (this.type === 'damageText') {
      ctx.font = '900 ' + Math.round(this.size) + 'px "Orbitron", monospace';
      ctx.fillStyle = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 8;
      ctx.textAlign = 'center';
      ctx.fillText(this.text, this.x, this.y);
    } else if (this.type === 'ring') {
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 3 * this.alpha;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(this.x, this.y, Math.max(0.5, this.size * this.alpha), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

// 2D Character Dash Ghost Silhouette
class DashGhost {
  constructor(x, y, spriteImg, facingLeft, width, height, color) {
    this.x = x;
    this.y = y;
    this.spriteImg = spriteImg;
    this.facingLeft = facingLeft;
    this.width = width;
    this.height = height;
    this.color = color;
    this.life = 0.25;
    this.maxLife = 0.25;
  }
  update(dt) {
    this.life -= dt;
  }
  draw(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife) * 0.55;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(this.x, this.y);

    if (this.facingLeft) {
      ctx.scale(-1, 1);
    }

    if (this.spriteImg && this.spriteImg.complete) {
      ctx.shadowColor = this.color || '#00ffcc';
      ctx.shadowBlur = 16;
      ctx.drawImage(this.spriteImg, -this.width / 2, -this.height / 2, this.width, this.height);
    } else {
      ctx.fillStyle = this.color || '#00ffcc';
      ctx.beginPath();
      ctx.arc(0, 0, 30, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

// ===================== PROJECTILES ===================== //
class Projectile {
  constructor(x, y, vx, vy, damage, isPlayer = true, type = 'pulse', range = 1200) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.damage = damage;
    this.isPlayer = isPlayer;
    this.type = type;
    this.traveled = 0;
    this.maxRange = range;
    this.active = true;
    this.pierce = type === 'railgun' ? 999 : 1;
    this.hitEntities = new Set();

    if (type === 'pulse') {
      this.radius = 5;
      this.color = '#00f3ff';
    } else if (type === 'scatter') {
      this.radius = 6;
      this.color = '#ffaa00';
    } else if (type === 'railgun') {
      this.radius = 9;
      this.color = '#00ff66';
    } else if (type === 'missile') {
      this.radius = 7;
      this.color = '#ff3366';
      this.life = 4.0;
    } else if (type === 'enemyLaser') {
      this.radius = 5;
      this.color = '#ff2255';
    } else if (type === 'bossRing') {
      this.radius = 7;
      this.color = '#ff0055';
    } else {
      this.radius = 5;
      this.color = '#fff';
    }
  }

  update(dt, player, particles) {
    const dist = Math.hypot(this.vx, this.vy) * dt * 60;
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;
    this.traveled += dist;

    if (this.traveled >= this.maxRange) {
      this.active = false;
      return;
    }

    if (this.type === 'missile' && player) {
      this.life -= dt;
      if (this.life <= 0) {
        this.active = false;
        return;
      }
      const angleToPlayer = Math.atan2(player.y - this.y, player.x - this.x);
      const currentAngle = Math.atan2(this.vy, this.vx);
      let diff = angleToPlayer - currentAngle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const turnRate = 2.8 * dt;
      const newAngle = currentAngle + Math.sign(diff) * Math.min(Math.abs(diff), turnRate);
      const speed = Math.hypot(this.vx, this.vy);
      this.vx = Math.cos(newAngle) * speed;
      this.vy = Math.sin(newAngle) * speed;

      if (Math.random() < 0.4) {
        particles.push(new Particle(this.x, this.y, -this.vx * 0.2 + (Math.random() - 0.5), -this.vy * 0.2 + (Math.random() - 0.5), '#ff4400', 4, 0.3, 'smoke'));
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = this.color;

    if (this.type === 'railgun') {
      const angle = Math.atan2(this.vy, this.vx);
      ctx.translate(this.x, this.y);
      ctx.rotate(angle);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-26, -4, 52, 8);
      ctx.fillStyle = '#00ff66';
      ctx.fillRect(-34, -8, 68, 16);
    } else {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();

      const speed = Math.hypot(this.vx, this.vy);
      if (speed > 1) {
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.radius * 1.6;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x - (this.vx / speed) * 20, this.y - (this.vy / speed) * 20);
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}

// ===================== PICKUPS ===================== //
class Pickup {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.radius = 18;
    this.pulse = 0;
    this.active = true;
    this.life = 25.0;

    if (type === 'heal') {
      this.color = '#00ff66';
      this.label = 'MED-KIT';
    } else if (type === 'scatterAmmo') {
      this.color = '#ffaa00';
      this.label = 'SCATTER';
    } else if (type === 'railgunAmmo') {
      this.color = '#00e5ff';
      this.label = 'RAILGUN';
    } else if (type === 'overdrive') {
      this.color = '#ff00ff';
      this.label = 'OVERDRIVE';
    }
  }

  update(dt, player) {
    this.pulse += dt * 4;
    this.life -= dt;
    if (this.life <= 0) this.active = false;

    const dist = Math.hypot(player.x - this.x, player.y - this.y);
    if (dist < 140) {
      const angle = Math.atan2(player.y - this.y, player.x - this.x);
      const pullSpeed = (140 - dist) * 3.0 * dt;
      this.x += Math.cos(angle) * pullSpeed;
      this.y += Math.sin(angle) * pullSpeed;
    }
  }

  draw(ctx) {
    ctx.save();
    const glow = Math.sin(this.pulse) * 4 + 8;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = glow;

    ctx.translate(this.x, this.y);
    ctx.rotate(this.pulse * 0.5);

    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(-14, -14, 28, 28);

    ctx.rotate(-this.pulse * 0.5);

    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = 'bold 11px "Orbitron", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(this.label, 0, -20);

    ctx.restore();
  }
}

// ===================== LARGE 2D PROMINENT HERO (100-110PX) ===================== //
class Player {
  constructor(x, y, charId = 'rx7') {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = 32; // Generous collision radius for a heroic 2D character
    this.angle = 0;
    this.facingLeft = false;

    // 2D Character Specifications
    this.characterId = charId;
    this.charDefs = {
      rx7: {
        name: 'UNIT RX-7',
        title: 'THE RENEGADE',
        spriteSrc: 'assets/hero_2d_transparent.png',
        badgeSrc: 'assets/badge_rx7.png',
        maxHp: 110,
        maxShield: 50,
        speed: 5.3,
        empCooldown: 8.5,
        themeColor: '#ff2244',
        spriteW: 104,
        spriteH: 114,
        eyeOffset: { x: 8, y: -28 },
        eyeColor: '#ff0033'
      },
      nova: {
        name: 'VALKYRIE NOVA',
        title: 'NEURAL VANGUARD',
        spriteSrc: 'assets/nova_2d_transparent.png',
        badgeSrc: 'assets/badge_nova.png',
        maxHp: 95,
        maxShield: 65,
        speed: 5.6,
        empCooldown: 6.8,
        themeColor: '#ff0088',
        spriteW: 98,
        spriteH: 114,
        eyeOffset: { x: 6, y: -26 },
        eyeColor: '#ff0055'
      },
      reaper: {
        name: 'REAPER-9',
        title: 'SKULL ASSASSIN',
        spriteSrc: 'assets/reaper_2d_transparent.png',
        badgeSrc: 'assets/badge_reaper.png',
        maxHp: 135,
        maxShield: 40,
        speed: 4.8,
        empCooldown: 9.0,
        themeColor: '#00f3ff',
        spriteW: 104,
        spriteH: 114,
        eyeOffset: { x: 8, y: -26 },
        eyeColor: '#00f3ff'
      }
    };

    const def = this.charDefs[charId] || this.charDefs.rx7;
    this.maxHp = def.maxHp;
    this.hp = def.maxHp;
    this.maxShield = def.maxShield;
    this.shield = def.maxShield;
    this.speed = def.speed;
    this.empCooldown = def.empCooldown;
    this.empTimer = 0;
    this.shieldRegenTimer = 0;
    this.shieldRegenDelay = 3.0;

    // Dash
    this.dashCooldown = 1.15;
    this.dashTimer = 0;
    this.isDashing = false;
    this.dashDuration = 0.22;
    this.dashTimeLeft = 0;
    this.dashDirX = 0;
    this.dashDirY = 0;

    // 2D Walk Bobbing Animation
    this.walkCycle = 0;
    this.isMoving = false;
    this.gunRecoil = 0;

    // Weapons
    this.activeWeaponIndex = 0;
    this.weapons = [
      { name: 'PULSE BLASTER', type: 'pulse', fireRate: 0.14, ammo: Infinity, maxAmmo: Infinity, damage: 27 },
      { name: 'SCATTER CANNON', type: 'scatter', fireRate: 0.38, ammo: 40, maxAmmo: 80, damage: 19 },
      { name: 'SYNDICATE RAILGUN', type: 'railgun', fireRate: 0.70, ammo: 14, maxAmmo: 30, damage: 135 }
    ];
    this.fireCooldown = 0;
    this.overdriveTime = 0;
    this.hitFlash = 0;

    // Preload Images
    this.spriteImg = new Image();
    this.spriteImg.src = def.spriteSrc;
    this.badgeImg = new Image();
    this.badgeImg.src = def.badgeSrc;

    // First-person gun asset
    this.gunImg = new Image();
    this.gunImg.src = 'assets/gun_transparent.png';
  }

  setCharacter(charId) {
    if (!this.charDefs[charId]) return;
    this.characterId = charId;
    const def = this.charDefs[charId];
    this.maxHp = def.maxHp;
    this.hp = def.maxHp;
    this.maxShield = def.maxShield;
    this.shield = def.maxShield;
    this.speed = def.speed;
    this.empCooldown = def.empCooldown;
    this.spriteImg = new Image();
    this.spriteImg.src = def.spriteSrc;
    this.badgeImg = new Image();
    this.badgeImg.src = def.badgeSrc;
  }

  takeDamage(amount, particles) {
    if (this.isDashing) return 0;

    this.hitFlash = 0.15;
    this.shieldRegenTimer = 0;

    let damageToHp = amount;
    if (this.shield > 0) {
      if (this.shield >= amount) {
        this.shield -= amount;
        damageToHp = 0;
      } else {
        damageToHp = amount - this.shield;
        this.shield = 0;
      }
    }

    this.hp = Math.max(0, this.hp - damageToHp);

    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = Math.random() * 4 + 2;
      particles.push(new Particle(this.x, this.y, Math.cos(a) * spd, Math.sin(a) * spd, '#00ffcc', 3, 0.3, 'spark'));
    }

    if (window.gameAudio) window.gameAudio.playHit();
    return damageToHp;
  }

  update(dt, keys, mouse, bounds, particles, ghosts) {
    if (this.fireCooldown > 0) this.fireCooldown -= dt;
    if (this.dashTimer > 0) this.dashTimer -= dt;
    if (this.empTimer > 0) this.empTimer -= dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.gunRecoil > 0) this.gunRecoil = Math.max(0, this.gunRecoil - dt * 25);

    if (this.overdriveTime > 0) {
      this.overdriveTime -= dt;
      if (Math.random() < 0.5) {
        particles.push(new Particle(this.x + (Math.random() - 0.5) * 30, this.y + (Math.random() - 0.5) * 30, 0, -2, '#ff00ff', 4, 0.4, 'spark'));
      }
    }

    this.shieldRegenTimer += dt;
    if (this.shieldRegenTimer >= this.shieldRegenDelay && this.shield < this.maxShield) {
      this.shield = Math.min(this.maxShield, this.shield + dt * 15);
    }

    // Aim direction & horizontal facing
    this.angle = Math.atan2(mouse.y - this.y, mouse.x - this.x);
    this.facingLeft = mouse.x < this.x;

    // Movement Input
    let moveX = 0;
    let moveY = 0;
    if (keys['KeyW'] || keys['ArrowUp']) moveY -= 1;
    if (keys['KeyS'] || keys['ArrowDown']) moveY += 1;
    if (keys['KeyA'] || keys['ArrowLeft']) moveX -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) moveX += 1;

    if (moveX !== 0 && moveY !== 0) {
      moveX *= 0.7071;
      moveY *= 0.7071;
    }

    this.isMoving = moveX !== 0 || moveY !== 0;
    if (this.isMoving) {
      this.walkCycle += dt * 14;
    } else {
      this.walkCycle = 0;
    }

    // Cyber-Dash
    if ((keys['Space'] || mouse.right) && this.dashTimer <= 0 && !this.isDashing) {
      this.isDashing = true;
      this.dashTimer = this.dashCooldown;
      this.dashTimeLeft = this.dashDuration;

      if (moveX !== 0 || moveY !== 0) {
        this.dashDirX = moveX;
        this.dashDirY = moveY;
      } else {
        this.dashDirX = Math.cos(this.angle);
        this.dashDirY = Math.sin(this.angle);
      }

      if (window.gameAudio) window.gameAudio.playDash();
      particles.push(new Particle(this.x, this.y, 0, 0, '#00ffcc', 16, 0.25, 'ring'));
    }

    const def = this.charDefs[this.characterId] || this.charDefs.rx7;
    if (this.isDashing) {
      this.dashTimeLeft -= dt;
      const dashSpeed = this.speed * 2.8;
      this.vx = this.dashDirX * dashSpeed;
      this.vy = this.dashDirY * dashSpeed;

      // 2D Ghost silhouette trail
      ghosts.push(new DashGhost(this.x, this.y, this.spriteImg, this.facingLeft, def.spriteW, def.spriteH, def.themeColor));

      if (this.dashTimeLeft <= 0) {
        this.isDashing = false;
      }
    } else {
      const targetSpeed = this.overdriveTime > 0 ? this.speed * 1.3 : this.speed;
      this.vx = this.vx * 0.75 + moveX * targetSpeed * 0.25;
      this.vy = this.vy * 0.75 + moveY * targetSpeed * 0.25;
    }

    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;

    this.x = Math.max(bounds.minX + this.radius, Math.min(bounds.maxX - this.radius, this.x));
    this.y = Math.max(bounds.minY + this.radius, Math.min(bounds.maxY - this.radius, this.y));
  }

  shoot(mouse, projectiles, particles) {
    if (this.isDashing) return;

    const currentWep = this.weapons[this.activeWeaponIndex];
    const rateMultiplier = this.overdriveTime > 0 ? 0.5 : 1.0;
    if (this.fireCooldown > 0) return;

    if (currentWep.ammo <= 0) {
      this.activeWeaponIndex = 0;
      return;
    }

    this.gunRecoil = 6.0;

    // Muzzle position right where the character's gun is held
    const gunSideOffset = this.facingLeft ? -25 : 25;
    const muzzleDist = 42;
    const muzzleX = this.x + Math.cos(this.angle) * muzzleDist + gunSideOffset * Math.sin(this.angle) * 0.3;
    const muzzleY = this.y + Math.sin(this.angle) * muzzleDist;

    if (currentWep.type === 'pulse') {
      const speed = 16;
      const perpAngle = this.angle + Math.PI / 2;
      const offset = 6;
      [-1, 1].forEach(side => {
        const bx = muzzleX + Math.cos(perpAngle) * (offset * side);
        const by = muzzleY + Math.sin(perpAngle) * (offset * side);
        projectiles.push(new Projectile(bx, by, Math.cos(this.angle) * speed, Math.sin(this.angle) * speed, currentWep.damage, true, 'pulse'));
      });
      if (window.gameAudio) window.gameAudio.playLaser('pulse');
    } else if (currentWep.type === 'scatter') {
      const speed = 14;
      const count = 6;
      const spread = 0.55;
      for (let i = 0; i < count; i++) {
        const a = this.angle - spread / 2 + (spread / (count - 1)) * i + (Math.random() - 0.5) * 0.1;
        const spd = speed * (0.9 + Math.random() * 0.2);
        projectiles.push(new Projectile(muzzleX, muzzleY, Math.cos(a) * spd, Math.sin(a) * spd, currentWep.damage, true, 'scatter', 550));
      }
      currentWep.ammo--;
      if (window.gameAudio) window.gameAudio.playLaser('scatter');
    } else if (currentWep.type === 'railgun') {
      const speed = 28;
      projectiles.push(new Projectile(muzzleX, muzzleY, Math.cos(this.angle) * speed, Math.sin(this.angle) * speed, currentWep.damage, true, 'railgun', 1600));
      currentWep.ammo--;
      if (window.gameAudio) window.gameAudio.playLaser('railgun');
    }

    this.fireCooldown = currentWep.fireRate * rateMultiplier;
    particles.push(new Particle(muzzleX, muzzleY, Math.cos(this.angle) * 5, Math.sin(this.angle) * 5, '#00ffcc', 10, 0.12, 'spark'));
  }

  useEmp(projectiles, enemies, particles) {
    if (this.empTimer > 0) return false;
    this.empTimer = this.empCooldown;

    if (window.gameAudio) window.gameAudio.playEmp();

    projectiles.forEach(p => {
      if (!p.isPlayer) {
        p.active = false;
        particles.push(new Particle(p.x, p.y, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, '#00ffff', 4, 0.2, 'spark'));
      }
    });

    const empRadius = this.characterId === 'nova' ? 440 : 380;
    enemies.forEach(e => {
      const dist = Math.hypot(e.x - this.x, e.y - this.y);
      if (dist < empRadius) {
        e.takeDamage(65, particles);
        e.stunTimer = 2.2;
      }
    });

    particles.push(new Particle(this.x, this.y, 0, 0, '#00f3ff', 24, 0.5, 'ring'));
    particles.push(new Particle(this.x, this.y, 0, 0, '#00ff66', 12, 0.7, 'ring'));
    return true;
  }

  // ===================== DRAWING PIPELINE (DUAL VIEW SUPPORT) ===================== //
  draw(ctx, viewMode = 'third_person', mouse, screenW, screenH) {
    const def = this.charDefs[this.characterId] || this.charDefs.rx7;

    if (viewMode === 'first_person') {
      // MODE 2: FIRST-PERSON ARCADE VIEW (SkillWarz style)
      // Display the futuristic blaster gun held in the bottom-right foreground
      ctx.save();
      const gunBaseX = screenW * 0.68;
      const gunBaseY = screenH - 20;

      // Gun sway with walking
      const swayX = this.isMoving ? Math.sin(this.walkCycle) * 12 : 0;
      const swayY = this.isMoving ? Math.abs(Math.cos(this.walkCycle)) * 10 : 0;
      const recoilOffset = this.gunRecoil * 5;

      ctx.translate(gunBaseX + swayX, gunBaseY + swayY + recoilOffset);

      // Parallax aim angle tilt
      const aimTilt = ((mouse.x - screenW / 2) / screenW) * 0.15;
      ctx.rotate(aimTilt);

      if (this.gunImg && this.gunImg.complete) {
        // Draw the high-tech blaster held in hand
        ctx.shadowColor = '#00ff66';
        ctx.shadowBlur = 12;
        const gw = 180;
        const gh = 320;
        ctx.drawImage(this.gunImg, -gw / 2, -gh + 40, gw, gh);
      }

      // First-person muzzle blast flash
      if (this.gunRecoil > 2.5) {
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#00f3ff';
        ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.arc(0, -290, 24, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      return;
    }

    // MODE 1: PROMINENT LARGE 2D CHARACTER (100-110px Tall)
    ctx.save();
    ctx.translate(this.x, this.y);

    // 1. Ground Shadow (Like Inkblade Survivors floor shadow)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.ellipse(0, 52, 40, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Aiming Laser Sight
    ctx.save();
    ctx.rotate(this.angle);
    ctx.strokeStyle = this.overdriveTime > 0 ? 'rgba(255, 0, 255, 0.5)' : 'rgba(0, 243, 255, 0.35)';
    ctx.lineWidth = 1.4;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(38, 0);
    ctx.lineTo(400, 0);
    ctx.stroke();
    ctx.restore();

    // 3. Forcefield Shield Dome
    if (this.shield > 0) {
      ctx.save();
      const shieldRatio = this.shield / this.maxShield;
      ctx.strokeStyle = `rgba(0, 243, 255, ${0.3 + shieldRatio * 0.4})`;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#00f3ff';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.ellipse(0, 0, 48, 58, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 4. Walking Bobbing & Step Motion
    const bobY = this.isMoving ? Math.sin(this.walkCycle) * 4.5 : 0;
    const tilt = this.isMoving ? Math.cos(this.walkCycle) * 0.04 : 0;

    ctx.save();
    ctx.translate(0, bobY);
    ctx.rotate(tilt);

    // Flip sprite horizontally when aiming to the left
    if (this.facingLeft) {
      ctx.scale(-1, 1);
    }

    // 5. DRAW THE PROMINENT 2D CHARACTER SPRITE (96x114px)
    if (this.spriteImg && this.spriteImg.complete) {
      ctx.shadowColor = def.themeColor;
      ctx.shadowBlur = 8;
      ctx.drawImage(this.spriteImg, -def.spriteW / 2, -def.spriteH / 2, def.spriteW, def.spriteH);

      // Hit Flash (White tint flash on damage)
      if (this.hitFlash > 0) {
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillRect(-def.spriteW / 2, -def.spriteH / 2, def.spriteW, def.spriteH);
        ctx.globalCompositeOperation = 'source-over';
      }
    }

    // 6. Glowing Cybernetic Eye Overlay
    ctx.fillStyle = def.eyeColor;
    ctx.shadowColor = def.eyeColor;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(def.eyeOffset.x, def.eyeOffset.y, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // 7. Muzzle Flash when firing
    if (this.gunRecoil > 2.0) {
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(42, -6, 9, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore(); // restore flip & bob

    // 8. Overhead Health Bar & Name Plate
    ctx.save();
    ctx.font = '700 11px "Orbitron", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 5;
    ctx.fillText(def.name, 0, -68);

    // Mini HP bar
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(-24, -62, 48, 5);
    ctx.fillStyle = '#00ff66';
    ctx.fillRect(-24, -62, Math.max(0, (this.hp / this.maxHp) * 48), 5);
    ctx.restore();

    ctx.restore(); // restore player translate
  }
}

// ===================== 2D ANIMATED ENEMIES ===================== //
class Enemy {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.active = true;
    this.hitFlash = 0;
    this.stunTimer = 0;
    this.walkCycle = Math.random() * 10;
  }

  takeDamage(amount, particles) {
    this.hp -= amount;
    this.hitFlash = 0.12;

    const dt = new Particle(this.x, this.y - 24, (Math.random() - 0.5) * 1.5, -2, amount >= 80 ? '#00ff66' : '#ffea00', amount >= 80 ? 17 : 13, 0.45, 'damageText');
    dt.text = Math.round(amount);
    particles.push(dt);

    for (let i = 0; i < 4; i++) {
      particles.push(new Particle(this.x, this.y, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, '#ff3344', 3, 0.25, 'spark'));
    }

    if (this.hp <= 0) {
      this.active = false;
      this.onDestroy(particles);
    }
  }

  onDestroy(particles) {
    if (window.gameAudio) window.gameAudio.playExplosion(false);
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = Math.random() * 6 + 2;
      particles.push(new Particle(this.x, this.y, Math.cos(a) * spd, Math.sin(a) * spd, '#ff4400', 4, 0.4, 'spark'));
    }
    particles.push(new Particle(this.x, this.y, 0, 0, '#ffaa00', 8, 0.3, 'smoke'));
  }
}

// 1. Scout Drone (Hovering 2D Drone with Rotors)
class ScoutDrone extends Enemy {
  constructor(x, y) {
    super(x, y, 'drone');
    this.hp = 35;
    this.maxHp = 35;
    this.radius = 20;
    this.speed = 3.2;
    this.shootTimer = Math.random() * 2 + 1;
    this.angle = 0;
    this.weave = Math.random() * Math.PI * 2;
    this.scoreValue = 150;
  }

  update(dt, player, projectiles, particles) {
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.stunTimer > 0) {
      this.stunTimer -= dt;
      return;
    }

    this.weave += dt * 3;
    this.walkCycle += dt * 25;
    const angleToPlayer = Math.atan2(player.y - this.y, player.x - this.x);
    this.angle = angleToPlayer;

    const dist = Math.hypot(player.x - this.x, player.y - this.y);
    let moveAngle = angleToPlayer;
    if (dist < 200) moveAngle += Math.PI;
    else moveAngle += Math.sin(this.weave) * 0.8;

    this.x += Math.cos(moveAngle) * this.speed * dt * 60;
    this.y += Math.sin(moveAngle) * this.speed * dt * 60;

    this.shootTimer -= dt;
    if (this.shootTimer <= 0) {
      this.shootTimer = 2.2 + Math.random() * 0.8;
      const spd = 7.5;
      projectiles.push(new Projectile(this.x, this.y, Math.cos(angleToPlayer) * spd, Math.sin(angleToPlayer) * spd, 12, false, 'enemyLaser'));
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 24, 20, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(this.angle);

    ctx.fillStyle = this.hitFlash > 0 ? '#ffffff' : '#1e2433';
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 2.2;
    ctx.shadowColor = '#00f3ff';
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    const rotorOffset = Math.sin(this.walkCycle) * 12;
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.6)';
    ctx.beginPath();
    ctx.moveTo(-8, -16); ctx.lineTo(-8 + rotorOffset, -16);
    ctx.moveTo(-8, 16);  ctx.lineTo(-8 + rotorOffset, 16);
    ctx.stroke();

    ctx.fillStyle = '#ff0044';
    ctx.shadowColor = '#ff0044';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(8, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// 2. Cyber Hound / Spider (Skittering 2D Multi-Legged Creature)
class CyberHound extends Enemy {
  constructor(x, y) {
    super(x, y, 'hound');
    this.hp = 55;
    this.maxHp = 55;
    this.radius = 22;
    this.speed = 4.6;
    this.angle = 0;
    this.attackCooldown = 0;
    this.scoreValue = 200;
  }

  update(dt, player, projectiles, particles) {
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.stunTimer > 0) {
      this.stunTimer -= dt;
      return;
    }

    this.walkCycle += dt * 18;
    const angle = Math.atan2(player.y - this.y, player.x - this.x);
    this.angle = angle;
    const dist = Math.hypot(player.x - this.x, player.y - this.y);

    this.x += Math.cos(angle) * this.speed * dt * 60;
    this.y += Math.sin(angle) * this.speed * dt * 60;

    if (dist < this.radius + player.radius && this.attackCooldown <= 0) {
      player.takeDamage(16, particles);
      this.attackCooldown = 0.8;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Floor Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 6, 26, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(this.angle);

    ctx.strokeStyle = this.hitFlash > 0 ? '#ffffff' : '#ff0055';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#ff0055';
    ctx.shadowBlur = 6;

    for (let i = -1; i <= 1; i++) {
      const legStep = Math.sin(this.walkCycle + i * 2) * 8;
      ctx.beginPath();
      ctx.moveTo(i * 8, -8);
      ctx.lineTo(i * 8 - 10, -18 + legStep);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(i * 8, 8);
      ctx.lineTo(i * 8 - 10, 18 - legStep);
      ctx.stroke();
    }

    ctx.fillStyle = this.hitFlash > 0 ? '#ffffff' : '#22080f';
    ctx.strokeStyle = '#ff0055';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ff2255';
    ctx.beginPath();
    ctx.moveTo(14, -5);
    ctx.lineTo(22, 0);
    ctx.lineTo(14, 5);
    ctx.fill();

    ctx.restore();
  }
}

// 3. Enforcer Android (2D Walking Humanoid Soldier)
class EnforcerAndroid extends Enemy {
  constructor(x, y) {
    super(x, y, 'android');
    this.hp = 90;
    this.maxHp = 90;
    this.radius = 26;
    this.speed = 2.4;
    this.angle = 0;
    this.burstTimer = 1.8;
    this.burstCount = 0;
    this.scoreValue = 300;
  }

  update(dt, player, projectiles, particles) {
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.stunTimer > 0) {
      this.stunTimer -= dt;
      return;
    }

    this.walkCycle += dt * 10;
    const angle = Math.atan2(player.y - this.y, player.x - this.x);
    this.angle = angle;
    const dist = Math.hypot(player.x - this.x, player.y - this.y);

    if (dist > 300) {
      this.x += Math.cos(angle) * this.speed * dt * 60;
      this.y += Math.sin(angle) * this.speed * dt * 60;
    } else if (dist < 180) {
      this.x -= Math.cos(angle) * this.speed * dt * 60;
      this.y -= Math.sin(angle) * this.speed * dt * 60;
    } else {
      this.x += Math.cos(angle + Math.PI / 2) * this.speed * 0.8 * dt * 60;
      this.y += Math.sin(angle + Math.PI / 2) * this.speed * 0.8 * dt * 60;
    }

    this.burstTimer -= dt;
    if (this.burstTimer <= 0) {
      const spd = 9.0;
      projectiles.push(new Projectile(this.x + Math.cos(angle) * 24, this.y + Math.sin(angle) * 24, Math.cos(angle) * spd, Math.sin(angle) * spd, 15, false, 'enemyLaser'));
      this.burstCount++;
      if (this.burstCount < 3) {
        this.burstTimer = 0.12;
      } else {
        this.burstCount = 0;
        this.burstTimer = 2.0 + Math.random() * 0.5;
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 22, 24, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(this.angle);

    const step = Math.sin(this.walkCycle) * 10;
    ctx.fillStyle = '#0e121a';
    ctx.fillRect(-8 + step, -14, 8, 6);
    ctx.fillRect(-8 - step, 8, 8, 6);

    ctx.fillStyle = this.hitFlash > 0 ? '#ffffff' : '#1e2430';
    ctx.strokeStyle = '#3388ff';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#3a4454';
    ctx.fillRect(6, 6, 22, 6);
    ctx.fillStyle = '#00f3ff';
    ctx.fillRect(10, 7, 16, 2.5);

    ctx.fillStyle = '#11141c';
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#00f3ff';
    ctx.shadowColor = '#00f3ff';
    ctx.shadowBlur = 6;
    ctx.fillRect(4, -5, 5, 10);

    ctx.restore();
  }
}

// 4. Heavy Mech (2D Bipedal Walker)
class HeavyMech extends Enemy {
  constructor(x, y) {
    super(x, y, 'heavy');
    this.hp = 240;
    this.maxHp = 240;
    this.radius = 36;
    this.speed = 1.6;
    this.angle = 0;
    this.fireTimer = 2.5;
    this.scoreValue = 600;
  }

  update(dt, player, projectiles, particles) {
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.stunTimer > 0) {
      this.stunTimer -= dt;
      return;
    }

    this.walkCycle += dt * 6;
    const angle = Math.atan2(player.y - this.y, player.x - this.x);
    this.angle = angle;

    this.x += Math.cos(angle) * this.speed * dt * 60;
    this.y += Math.sin(angle) * this.speed * dt * 60;

    this.fireTimer -= dt;
    if (this.fireTimer <= 0) {
      this.fireTimer = 2.8;
      if (Math.random() < 0.5) {
        projectiles.push(new Projectile(this.x, this.y, Math.cos(angle) * 4.5, Math.sin(angle) * 4.5, 25, false, 'missile'));
      } else {
        [-0.25, 0, 0.25].forEach(offset => {
          projectiles.push(new Projectile(this.x, this.y, Math.cos(angle + offset) * 7.5, Math.sin(angle + offset) * 7.5, 18, false, 'enemyLaser'));
        });
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(0, 30, 36, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(this.angle);

    const stomp = Math.sin(this.walkCycle) * 12;
    ctx.fillStyle = '#161922';
    ctx.fillRect(-16 + stomp, -26, 16, 9);
    ctx.fillRect(-16 - stomp, 17, 16, 9);

    ctx.fillStyle = this.hitFlash > 0 ? '#ffffff' : '#242b38';
    ctx.strokeStyle = '#ffaa00';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#ffaa00';
    ctx.shadowBlur = 10;

    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ff8800';
    ctx.fillRect(20, -16, 20, 7);
    ctx.fillRect(20, 9, 20, 7);

    ctx.restore();
  }
}

// ===================== BOSS: CORE-TITAN EX-9 ===================== //
class BossCoreTitan extends Enemy {
  constructor(x, y) {
    super(x, y, 'boss');
    this.name = 'CORE-TITAN EX-9';
    this.title = 'CORPORATE ENFORCER OVERSEER';
    this.maxHp = 1800;
    this.hp = 1800;
    this.radius = 70;
    this.speed = 1.4;
    this.angle = 0;
    this.coreRotation = 0;
    this.scoreValue = 5000;

    this.phase = 1;
    this.attackTimer = 1.0;
  }

  update(dt, player, projectiles, particles) {
    if (this.hitFlash > 0) this.hitFlash -= dt;

    const hpRatio = this.hp / this.maxHp;
    if (hpRatio <= 0.33) {
      this.phase = 3;
      this.speed = 2.0;
    } else if (hpRatio <= 0.66) {
      this.phase = 2;
      this.speed = 1.6;
    } else {
      this.phase = 1;
      this.speed = 1.2;
    }

    this.coreRotation += dt * (this.phase === 3 ? 5 : 2.5);

    const angleToPlayer = Math.atan2(player.y - this.y, player.x - this.x);
    this.angle = angleToPlayer;

    const dist = Math.hypot(player.x - this.x, player.y - this.y);
    if (dist > 180) {
      this.x += Math.cos(angleToPlayer) * this.speed * dt * 60;
      this.y += Math.sin(angleToPlayer) * this.speed * dt * 60;
    }

    this.attackTimer -= dt;
    if (this.attackTimer <= 0) {
      this.executePattern(player, projectiles, particles);
    }
  }

  executePattern(player, projectiles, particles) {
    if (this.phase === 1) {
      const bullets = 10;
      for (let i = 0; i < bullets; i++) {
        const a = this.coreRotation + (i * Math.PI * 2) / bullets;
        projectiles.push(new Projectile(this.x, this.y, Math.cos(a) * 6, Math.sin(a) * 6, 14, false, 'enemyLaser'));
      }
      this.attackTimer = 0.9;
    } else if (this.phase === 2) {
      const rings = 16;
      for (let i = 0; i < rings; i++) {
        const a = (i * Math.PI * 2) / rings;
        projectiles.push(new Projectile(this.x, this.y, Math.cos(a) * 5.5, Math.sin(a) * 5.5, 18, false, 'bossRing'));
      }
      projectiles.push(new Projectile(this.x, this.y, Math.cos(this.angle) * 5, Math.sin(this.angle) * 5, 25, false, 'missile'));
      this.attackTimer = 1.2;
    } else {
      const count = 18;
      for (let i = 0; i < count; i++) {
        const a = this.coreRotation * 2 + (i * Math.PI * 2) / count;
        projectiles.push(new Projectile(this.x, this.y, Math.cos(a) * 7.5, Math.sin(a) * 7.5, 20, false, 'bossRing'));
      }
      projectiles.push(new Projectile(this.x, this.y, Math.cos(this.angle + 0.6) * 5, Math.sin(this.angle + 0.6) * 5, 25, false, 'missile'));
      projectiles.push(new Projectile(this.x, this.y, Math.cos(this.angle - 0.6) * 5, Math.sin(this.angle - 0.6) * 5, 25, false, 'missile'));
      this.attackTimer = 0.75;
    }
  }

  onDestroy(particles) {
    if (window.gameAudio) window.gameAudio.playExplosion(true);
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = Math.random() * 9 + 3;
      particles.push(new Particle(this.x, this.y, Math.cos(a) * spd, Math.sin(a) * spd, '#ff0033', 6, 0.8, 'spark'));
    }
    particles.push(new Particle(this.x, this.y, 0, 0, '#ff0055', 40, 0.8, 'ring'));
    particles.push(new Particle(this.x, this.y, 0, 0, '#00ff66', 20, 1.2, 'ring'));
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.ellipse(0, 70, 60, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    const isPhase3 = this.phase === 3;
    const mainColor = isPhase3 ? '#ff0033' : (this.phase === 2 ? '#ffaa00' : '#00f3ff');

    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 4;
    ctx.shadowColor = mainColor;
    ctx.shadowBlur = 16;

    ctx.save();
    ctx.rotate(this.coreRotation);
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const px = Math.cos(a) * this.radius;
      const py = Math.sin(a) * this.radius;
      ctx.fillStyle = '#141722';
      ctx.fillRect(px - 12, py - 12, 24, 24);
      ctx.strokeStyle = mainColor;
      ctx.strokeRect(px - 12, py - 12, 24, 24);
    }
    ctx.restore();

    ctx.fillStyle = this.hitFlash > 0 ? '#ffffff' : '#0d1017';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = isPhase3 ? '#ff0044' : '#00f3ff';
    ctx.shadowColor = isPhase3 ? '#ff0044' : '#00f3ff';
    ctx.shadowBlur = 25;
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
