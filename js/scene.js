// Stick Gang — motor de scenă cu animații realiste (cinematică inversă), fețe expresive,
// fizică (apucă & aruncă), și interacțiuni. Păstrează: chat, aventură, foc, construcții,
// coliziune, somn, salt, "veniti".

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

let groundY = 0;
let structures = [];
let particles = []; // praf la aterizare

// proporții schelet
const HIP_Y = -52, THIGH = 26, SHIN = 26, TORSO = 44, NECK = 8, UPPER = 20, FORE = 18;
const SHOULDER_Y = HIP_Y - TORSO;

// cinematică inversă cu 2 segmente → poziția genunchiului/cotului
function solveIK(ax, ay, bx, by, l1, l2, bend) {
  let dx = bx - ax, dy = by - ay;
  let d = Math.hypot(dx, dy) || 0.0001;
  const nx = dx / d, ny = dy / d;
  d = clamp(d, Math.abs(l1 - l2) + 0.01, l1 + l2 - 0.01);
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const mx = ax + nx * a, my = ay + ny * a;
  return { x: mx - ny * h * bend, y: my + nx * h * bend };
}

function spawnDust(x, y, n) {
  for (let i = 0; i < n; i++) {
    particles.push({ x, y, vx: rand(-2.2, 2.2), vy: rand(-2.6, -0.3), life: rand(18, 32), r: rand(2, 5) });
  }
}

function wrapText(text, maxLen) {
  const words = String(text).split(/\s+/);
  const lines = []; let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxLen && cur) { lines.push(cur); cur = w; }
    else cur = (cur ? cur + " " : "") + w;
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 6);
}

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp(Math.round(((n >> 16) & 255) * f), 0, 255);
  const g = clamp(Math.round(((n >> 8) & 255) * f), 0, 255);
  const b = clamp(Math.round((n & 255) * f), 0, 255);
  return `rgb(${r},${g},${b})`;
}

class Agent {
  constructor(c, W) {
    this.c = c;
    this.x = rand(120, W - 120);
    this.face = Math.random() < 0.5 ? 1 : -1;
    this.speed = rand(0.55, 0.95);
    this.state = "walk";
    this.targetX = null;
    this.walkPhase = Math.random() * Math.PI * 2;
    this.bob = Math.random() * Math.PI * 2;
    this.vx = 0;
    this.stateTimer = rand(60, 200);
    this.hitCooldown = 0;
    this.opponent = null;
    this.punchTimer = 0;
    this.attacker = false;
    this.attackType = "punch";
    this.attackAnim = 0;
    this.recoil = 0;
    this.stars = [];
    this.say = null;
    this.chatterTimer = rand(300, 900);
    this.lie = 0;
    this.sleepPhase = null;
    this.sleepTimer = 0;
    this.sleepDir = 1;
    this.sleepCd = rand(3600, 18000);
    this.chatting = false;
    this.building = null;
    this.buildTimer = 0;
    this.buildDur = 0;
    this.builtCount = 0;
    this.jumping = false;
    this.jumpT = 0;
    this.jumpCd = 0;
    this.away = false;
    this.awayTimer = 0;
    this.exitX = 0;
    this.adventure = false;
    this.burning = false;
    this.burnTimer = 0;
    this.willWater = false;
    this.waterAnim = 0;
    this.burnCd = 0;
    // animație expresivă
    this.blinkTimer = rand(90, 300);
    this.blink = 0;
    this.lookX = 0; this.lookY = 0;   // privire (spre cursor)
    this.squash = 0;                  // squash & stretch la aterizare
    this.startle = 0;                 // tresărire la cursor rapid
    this.waveTimer = 0;               // salut
    this.greetCd = 0;
    // fizică aruncare
    this.tz = 0; this.tzv = 0; this.tvx = 0; this.tangle = 0; this.tangVel = 0; this.bounces = 0;
    this.heldY = 0;
    this.scaredTimer = 0; this.fleeDir = 1; this.fleeTimer = 0;
    this.watchTarget = 0; // se uită la Chrome
  }

  enterScared() {
    this.state = "scared"; this.scaredTimer = 180; this.fleeTimer = 0; // ~3s
    this.lie = 0; this.sleepPhase = null;
    this.fleeDir = this.x < pointer.x ? -1 : 1;
    this.speak(pick(["Aaah!", "Sperietură!", "Nu mă prinde!"]), 60);
  }

  returnFromAdventure(W) {
    this.away = false; this.adventure = false;
    const side = Math.random() < 0.5 ? -1 : 1;
    this.x = side < 0 ? 60 : W - 60;
    this.face = side < 0 ? 1 : -1;
    this.state = "walk"; this.targetX = rand(220, W - 220);
    this.speak(this.c.id === "orange" ? "Ce aventură!" : "Ne-am întors!", 140);
  }

  wouldCollide(nx) {
    if (this.jumping) return false;
    for (const o of agents) {
      if (o === this || o.away || o.jumping || o.state === "held" || o.state === "thrown") continue;
      const gap = (o.state === "sleep" && o.lie > 0.3) ? 74 : 38; // cei culcați ocupă mai mult
      if (Math.abs(nx - o.x) < gap && Math.abs(nx - o.x) < Math.abs(this.x - o.x)) return true;
    }
    return false;
  }

  speak(text, ttl = 120, ambient = true) {
    this.say = { text, ttl };
    if (ambient && typeof window.onStickSpeak === "function") window.onStickSpeak(this.c.id, text);
  }

  getHit(fromX) {
    if (this.hitCooldown > 0 || this.state === "held" || this.state === "thrown") return;
    this.hitCooldown = 40;
    this.state = "hit";
    this.stateTimer = 40;
    this.lie = 0; this.sleepPhase = null; this.building = null;
    this.vx = (this.x >= fromX ? 1 : -1) * 10;
    this.recoil = 16;
    this.stars = [];
    for (let i = 0; i < 4; i++) this.stars.push({ ang: (Math.PI * 2 * i) / 4, r: 30 });
    this.speak(pick(this.c.hitLines), 70);
    if (this.opponent) this.endFight();
  }

  grab() {
    this.state = "held";
    this.heldY = Math.min(pointer.y, groundY);
    this.jumping = false; this.burning = false; this.building = null;
    this.lie = 0; this.sleepPhase = null; this.sleepCd = rand(3600, 18000); // se trezește dacă dormea
    if (this.opponent) this.endFight();
    this.speak(pick(["Hei!", "Uau!", "Aaah!", "Pune-mă jos!"]), 90);
  }
  release(vx, vy) {
    this.state = "thrown";
    this.tz = Math.max(0, groundY - this.heldY);
    this.tvx = clamp(vx, -22, 22);
    this.tzv = clamp(vy, -26, 8);
    this.tangle = 0;
    this.tangVel = clamp(vx, -22, 22) * 0.03 + rand(-0.05, 0.05);
    this.bounces = 0;
    this.face = this.tvx >= 0 ? 1 : -1;
    this.speak(pick(["Woohoo!", "Aaaa!", "Zbooor!"]), 80);
  }

  startFight(other) {
    this.state = "fight"; this.opponent = other; this.stateTimer = rand(300, 520);
    this.attacker = true; this.punchTimer = 34;
    this.speak(pick(this.c.fightLines), 90);
  }
  endFight() {
    if (this.opponent) { this.opponent.opponent = null; this.opponent.state = "walk"; this.opponent.stateTimer = rand(60, 160); }
    this.opponent = null; this.state = "walk"; this.stateTimer = rand(60, 160);
  }

  update(W) {
    if (this.away) { if (--this.awayTimer <= 0) this.returnFromAdventure(W); return; }

    this.bob += 0.06;
    if (this.hitCooldown > 0) this.hitCooldown--;
    if (this.attackAnim > 0) this.attackAnim--;
    if (this.recoil > 0.5) this.recoil *= 0.85; else this.recoil = 0;
    if (this.squash > 0) this.squash *= 0.82;
    if (this.startle > 0) this.startle--;
    if (this.waveTimer > 0) this.waveTimer--;
    if (this.greetCd > 0) this.greetCd--;
    this.stars.forEach(s => { s.ang += 0.2; s.r *= 0.96; });

    // stări care ignoră restul
    if (this.state === "held") { this.x = pointer.x; return; }
    if (this.state === "thrown") { this.updateThrown(W); return; }

    if (this.state !== "sleep" && !this.chatting) this.sleepCd--;

    if (this.say) { if (--this.say.ttl <= 0) this.say = null; }
    if (--this.chatterTimer <= 0) {
      this.chatterTimer = rand(700, 1500);
      if (this.state === "walk" || this.state === "idle") this.speak(pick(this.c.chatter), 120);
    }

    if (this.chatting) { this.state = "idle"; this.face = 1; this.jumping = false; return; }

    // salt (overlay)
    if (this.jumpCd > 0) this.jumpCd--;
    if (this.jumping) {
      this.jumpT += 1 / 34;
      this.x += this.face * (this.speed + 2.4);
      this.walkPhase += 0.2;
      if (this.jumpT >= 1) { this.jumping = false; this.jumpT = 0; this.jumpCd = 30; this.squash = 1; spawnDust(this.x, groundY, 5); }
    }

    // FOC
    if (this.burnCd > 0) this.burnCd--;
    if (this.waterAnim > 0) { this.waterAnim--; if (this.waterAnim === 0) this.speak("O iau înapoi.", 70); }
    if (this.burning) {
      if (--this.burnTimer <= 0) {
        this.burning = false; this.burnCd = 120;
        if (this.willWater) { this.waterAnim = 70; this.state = "idle"; this.targetX = null; this.speak("Apă! 🪣", 90); }
        else this.speak(pick(["Uf! Gata.", "Am scăpat!"]), 80);
      }
    } else if (this.burnCd <= 0 && this.waterAnim <= 0 && (this.state === "walk" || this.state === "run" || this.state === "idle" || this.state === "scared")) {
      for (const s of structures) {
        if (s.type === "campfire" && s.progress > 0.5 && !s.out && Math.abs(s.x - this.x) < 26) {
          s.hits = (s.hits || 0) + 1;
          if (s.hits >= 3) { // al 3-lea stinge focul cu apă; dispare după 5s
            s.out = true; s.outTimer = 300;
            this.state = "idle"; this.targetX = null; this.waterAnim = 70; this.burnCd = 120;
            this.speak("Ajunge! Apă! 🪣", 110);
          } else {
            this.burning = true; this.willWater = Math.random() < 0.25;
            this.burnTimer = this.willWater ? 120 : 300;
            this.state = "run"; this.targetX = rand(80, W - 80);
            this.speak("Arde! 🔥", 100);
          }
          break;
        }
      }
    }

    // tresărire la cursor rapid și aproape (fără să lovească)
    if (this.startle <= 0 && (this.state === "walk" || this.state === "idle")) {
      const dxm = this.x - pointer.x, dym = (groundY - 60) - pointer.y;
      const near = Math.hypot(dxm, dym) < 70;
      const fast = Math.hypot(pointer.x - pointer.px, pointer.y - pointer.py) > 24;
      if (near && fast) { this.startle = 22; this.face = dxm >= 0 ? 1 : -1; this.speak("!", 40); }
    }

    // ---- mașină de stări ----
    if (this.state === "hit") {
      this.x += this.vx; this.vx *= 0.9;
      if (--this.stateTimer <= 0) { this.state = "walk"; this.stateTimer = rand(60, 160); this.targetX = null; }
    }
    else if (this.state === "leaving") {
      const dx = this.exitX - this.x;
      this.face = dx >= 0 ? 1 : -1;
      this.x += Math.sign(dx) * (this.speed + 1.3);
      this.walkPhase += 0.18;
      if (this.x < -50 || this.x > W + 50) { this.away = true; this.awayTimer = expedition ? expedition.duration : rand(3600, 18000); }
    }
    else if (this.state === "watch") {
      if (!browserWin) { this.state = "walk"; this.targetX = null; this.stateTimer = rand(30, 90); }
      else {
        const dx = this.watchTarget - this.x;
        if (Math.abs(dx) > 5) { const step = Math.sign(dx) * this.speed * 1.7; this.face = dx >= 0 ? 1 : -1; if (!this.wouldCollide(this.x + step)) { this.x += step; this.walkPhase += 0.13; } }
        else { this.face = (browserWin.x + browserWin.w / 2) >= this.x ? 1 : -1; if (!this.say && Math.random() < 0.004) this.speak(pick(["Ooo!", "Haha!", "Tare!", "👀", "Încă unul!"]), 70); }
      }
    }
    else if (this.state === "scared") {
      if (--this.scaredTimer <= 0) { this.state = "walk"; this.targetX = null; this.stateTimer = rand(40, 90); this.speak(pick(["Uf...", "Gata?"]), 60); }
      else {
        if (--this.fleeTimer <= 0) { this.fleeTimer = rand(14, 28); const away = this.x < pointer.x ? -1 : 1; this.fleeDir = Math.random() < 0.75 ? away : -away; }
        const step = this.fleeDir * this.speed * 2.8;
        if (!this.wouldCollide(this.x + step)) { this.x += step; this.face = this.fleeDir; this.walkPhase += 0.24; }
        else this.fleeDir *= -1;
        if (!this.say && Math.random() < 0.03) this.speak(pick(["Aaah!", "Nu mă prinde!", "Ferește!"]), 40);
      }
    }
    else if (this.state === "build") {
      if (this.building) this.building.progress = Math.min(1, 1 - this.buildTimer / this.buildDur);
      if (--this.buildTimer <= 0) {
        if (this.building) this.building.progress = 1;
        this.building = null; this.state = "idle"; this.targetX = null; this.stateTimer = rand(60, 140);
        this.speak(pick(["Gata!", "Frumoasă!", "Casa mea! 🏠"]), 100);
      }
    }
    else if (this.state === "run") {
      if (this.targetX === null) { this.state = "walk"; this.stateTimer = rand(40, 100); }
      else {
        const dx = this.targetX - this.x;
        if (Math.abs(dx) < 6) { this.targetX = null; this.state = "walk"; this.stateTimer = rand(40, 120); }
        else if (!this.jumping) {
          const step = Math.sign(dx) * this.speed * 2.6;
          this.face = dx >= 0 ? 1 : -1;
          if (!this.wouldCollide(this.x + step)) { this.x += step; this.walkPhase += 0.22; }
        }
      }
    }
    else if (this.state === "sleep") {
      if (this.sleepPhase === "down") { this.lie = Math.min(1, this.lie + 0.04); if (this.lie >= 1) { this.sleepPhase = "rest"; this.sleepTimer = 1200; } }
      else if (this.sleepPhase === "rest") { if (--this.sleepTimer <= 0) this.sleepPhase = "up"; else if (!this.say && Math.random() < 0.004) this.speak("Zzz", 110); }
      else { this.lie = Math.max(0, this.lie - 0.05); if (this.lie <= 0) { this.state = "walk"; this.targetX = null; this.stateTimer = rand(80, 180); } }
    }
    else if (this.state === "fight") {
      const o = this.opponent;
      if (!o) { this.state = "walk"; return; }
      const dx = o.x - this.x;
      const d = Math.abs(dx) || 1;
      this.face = dx >= 0 ? 1 : -1;
      if (d > 66) { this.x += Math.sign(dx) * (this.speed + 0.5); this.walkPhase += 0.16; }
      else if (d < 52) { // prea aproape → se depărtează (nu se suprapun)
        const s = dx !== 0 ? Math.sign(dx) : (agents.indexOf(this) < agents.indexOf(o) ? 1 : -1);
        this.x -= s * (this.speed + 0.5); this.walkPhase += 0.13;
      }
      else if (this.attacker && this.punchTimer-- <= 0) {
        this.punchTimer = rand(30, 50);
        this.attackType = Math.random() < 0.5 ? "punch" : "kick";
        this.attackAnim = 16;
        o.recoil = this.attackType === "kick" ? 18 : 14;
        o.stars = [{ ang: 0, r: 22 }, { ang: 2, r: 22 }, { ang: 4, r: 22 }];
        if (!o.say) o.speak(pick(o.c.hitLines), 45);
        this.attacker = false; o.attacker = true; o.punchTimer = rand(24, 40);
      }
      if (--this.stateTimer <= 0) this.endFight();
    }
    else { // walk / idle
      if (this.startle > 0) {
        this.x += this.face * 1.4; // face un pas înapoi speriat
      } else if (this.targetX === null || this.stateTimer-- <= 0) {
        if (this.sleepCd <= 0) {
          this.state = "sleep"; this.sleepPhase = "down"; this.lie = 0;
          this.sleepDir = Math.random() < 0.5 ? 1 : -1; this.speak("...", 60); this.sleepCd = rand(14400, 21600);
        } else {
          const r = Math.random();
          if (r < 0.012 && this.builtCount < 2 && structures.length < 8) {
            const type = pick(["house", "tower", "tree", "campfire"]);
            this.state = "build"; this.buildDur = rand(340, 480); this.buildTimer = this.buildDur;
            const s = { x: this.x, color: this.c.color, progress: 0, type }; structures.push(s); this.building = s; this.builtCount++;
            const m = { house: ["Construiesc!", "O casă!"], tower: ["Un turn!", "Sus!"], tree: ["Un copac!", "Verde!"], campfire: ["Un foc!", "Cald!"] };
            this.speak(pick(m[type]), 120);
          } else if (r < 0.22) { this.state = "run"; this.targetX = rand(80, W - 80); this.stateTimer = rand(120, 260); this.speak(pick(["Aici!", "Repede!", "Hop!"]), 60); }
          else if (r < 0.45) { this.state = "idle"; this.targetX = null; this.stateTimer = rand(60, 140); }
          else { this.state = "walk"; this.targetX = rand(80, W - 80); this.stateTimer = rand(120, 300); }
        }
      }
      if (this.state === "walk" && this.targetX !== null && !this.jumping && this.startle <= 0) {
        const dx = this.targetX - this.x;
        if (Math.abs(dx) < 4) this.targetX = null;
        else {
          const step = Math.sign(dx) * this.speed;
          this.face = dx >= 0 ? 1 : -1;
          if (!this.wouldCollide(this.x + step)) { this.x += step; this.walkPhase += 0.115; }
        }
      }
    }

    // salt peste cineva în față (50/50 care sare)
    if ((this.state === "walk" || this.state === "run") && !this.jumping && this.jumpCd <= 0) {
      for (const o of agents) {
        if (o === this || o.away || o.jumping || o.state === "held" || o.state === "thrown" || o.state === "sleep") continue; // nu sări peste cei culcați
        const dxo = o.x - this.x;
        if (Math.sign(dxo) === this.face && Math.abs(dxo) > 10 && Math.abs(dxo) < 46) {
          const headOn = (o.face === -this.face);
          if (headOn && o.jumpCd <= 0 && Math.random() < 0.5) { o.jumping = true; o.jumpT = 0; }
          else { this.jumping = true; this.jumpT = 0; }
          this.jumpCd = 70; o.jumpCd = 70; break;
        }
      }
    }

    // salut la trecere
    if (this.greetCd <= 0 && (this.state === "walk")) {
      for (const o of agents) {
        if (o === this || o.away || o.state === "sleep" || o.state === "fight" || o.state === "thrown" || o.state === "held") continue;
        if (Math.abs(o.x - this.x) < 74 && Math.abs(o.x - this.x) > 40 && Math.random() < 0.02) {
          this.waveTimer = 45; this.greetCd = 400; o.greetCd = 300;
          this.speak(pick(["Salut!", "Hei!", "Ce faci?"]), 70); break;
        }
      }
    }

    if (this.state !== "leaving") this.x = clamp(this.x, 60, W - 60);
  }

  updateThrown(W) {
    this.tvx *= 0.992;
    this.tzv += 0.85; // gravitație
    this.x += this.tvx;
    this.tz -= this.tzv;
    this.tangle += this.tangVel;
    if (this.x < 40 || this.x > W - 40) { this.tvx *= -0.5; this.x = clamp(this.x, 40, W - 40); }
    if (this.tz <= 0) {
      this.tz = 0;
      if (this.tzv > 5 && this.bounces < 2) {
        this.bounces++;
        this.tzv = -this.tzv * 0.45; this.tvx *= 0.6; this.tangVel *= 0.6;
        spawnDust(this.x, groundY, 6);
      } else {
        this.squash = 1.4; spawnDust(this.x, groundY, 8);
        this.tangle = 0; this.tangVel = 0;
        this.enterScared(); // se sperie și fuge de tine ~3s
      }
    }
  }

  // ---------- DESEN ----------
  draw(ctx) {
    if (this.away) return;
    const c = this.c;

    // origine + transformări în funcție de stare
    ctx.save();
    let scaleX = this.face, scaleY = 1;
    if (this.state === "held") {
      ctx.translate(pointer.x, this.heldY);
    } else if (this.state === "thrown") {
      ctx.translate(this.x, groundY - this.tz);
      ctx.rotate(this.tangle);
    } else {
      const jumpY = this.jumping ? Math.sin(this.jumpT * Math.PI) * 155 : 0;
      ctx.translate(Math.round(this.x - (this.recoil || 0) * this.face), Math.round(groundY) - jumpY);
      if (this.lie > 0) ctx.rotate(this.lie * (Math.PI / 2) * this.sleepDir);
      // squash & stretch
      if (this.jumping) { const s = Math.sin(this.jumpT * Math.PI); scaleY = 1 + s * 0.12; scaleX *= 1 - s * 0.06; }
      if (this.squash > 0.02) { scaleY *= 1 - this.squash * 0.28; scaleX *= 1 + this.squash * 0.24; }
    }
    ctx.scale(scaleX, scaleY);

    ctx.strokeStyle = c.color; ctx.fillStyle = c.color;
    ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.lineJoin = "round";

    this.drawSkeleton(ctx);

    ctx.restore();

    // stele, flăcări, apă, mesaj — în spațiul ecranului
    this.drawFx(ctx);
  }

  drawSkeleton(ctx) {
    const c = this.c, st = this.state;
    const walking = (st === "walk" || st === "run" || st === "fight" || st === "leaving" || st === "scared" || st === "watch");
    const running = (st === "run" || st === "leaving" || st === "scared");
    const breathe = Math.sin(this.bob) * 1.5;
    const bodyBob = walking ? Math.sin(this.walkPhase * 2) * 2 : breathe;
    const lean = running ? 7 : (this.startle > 0 ? -5 : 0);
    const hipY = HIP_Y + bodyBob;
    const shX = lean, shY = SHOULDER_Y + bodyBob, asY = shY + 4;
    const headR = c.headR, headX = lean * 1.2, headY = shY - NECK - headR;
    const striking = st === "fight" && this.attackAnim > 0;
    const HANG = 32;

    // ===== PICIOARE =====
    if (st === "held") {
      const sway = Math.sin(this.bob * 2) * 5;
      this.legIK(ctx, -3, hipY, -8 + sway, hipY + 46, -1);
      this.legIK(ctx, 3, hipY, 10 + sway, hipY + 46, -1);
    } else if (st === "thrown") {
      const sp = Math.sin(this.tangle * 2) * 10;
      this.legIK(ctx, -3, hipY, -20 + sp, hipY + 40, -1);
      this.legIK(ctx, 3, hipY, 22 + sp, hipY + 40, -1);
    } else if (this.jumping) {
      for (const side of [-1, 1]) { const hx = side * 3; ctx.beginPath(); ctx.moveTo(hx, hipY); ctx.lineTo(hx + side * 12, hipY + 14); ctx.lineTo(hx + side * 4, hipY - 2); ctx.stroke(); }
    } else if (striking && this.attackType === "kick") {
      this.legIK(ctx, -4, hipY, -8, 0, -1);
      ctx.beginPath(); ctx.moveTo(4, hipY); ctx.lineTo(26, hipY + 2); ctx.lineTo(52, hipY - 8); ctx.stroke();
    } else if (st === "sleep" || st === "build" || st === "idle") {
      this.legIK(ctx, -4, hipY, -6, 0, -1);
      this.legIK(ctx, 4, hipY, 6, 0, -1);
    } else {
      const stride = running ? 22 : 15, liftH = running ? 24 : 14;
      for (const side of [-1, 1]) {
        const p = this.walkPhase + (side < 0 ? 0 : Math.PI);
        const footX = side * 4 + Math.sin(p) * stride;
        const footY = -Math.max(0, Math.cos(p)) * liftH;
        this.legIK(ctx, side * 3, hipY, footX, footY, -1);
      }
    }

    // ===== CORP =====
    ctx.beginPath(); ctx.moveTo(0, hipY); ctx.lineTo(shX, shY); ctx.stroke();

    // ===== BRAȚE ===== (cinematică directă — stau pe lateral, nu trec prin corp)
    const seg = (ex, ey, hx, hy) => { ctx.beginPath(); ctx.moveTo(shX, asY); ctx.lineTo(shX + ex, asY + ey); ctx.lineTo(shX + hx, asY + hy); ctx.stroke(); };
    if (st === "held") {
      const s = Math.sin(this.bob * 2) * 5;
      seg(-8 + s, 16, -12 + s, 32); seg(8 - s, 16, 12 - s, 32);
    } else if (st === "thrown") {
      const s = Math.sin(this.tangle * 2) * 10;
      seg(-18 + s, 6, -32 + s, -2); seg(18 + s, 6, 32 + s, -2);
    } else if (this.jumping) {
      seg(14, -12, 24, -26); seg(-14, -12, -24, -26);
    } else if (this.waveTimer > 0) {
      const w = Math.sin(this.waveTimer * 0.6) * 8;
      seg(14 + w, -14, 20 + w, -30); seg(-12, 16, -18, 30);
    } else if (st === "build") {
      const hm = Math.sin(this.bob * 5) * 12;
      seg(14, -8 + hm, 22, -22 + hm); seg(-14, -6 - hm, -22, -18 - hm);
    } else if (striking && this.attackType === "punch") {
      seg(22, -2, 42, -6); seg(-10, 12, -6, -2);
    } else if (st === "fight") {
      seg(12, 8, 20, -6); seg(-10, 10, -4, -4);
    } else if (st === "sleep") {
      seg(-12, 12, -18, 24); seg(12, 12, 18, 24);
    } else {
      const amt = running ? 0.85 : (walking ? 0.55 : 0.12);
      for (const side of [-1, 1]) {
        const p = this.walkPhase + (side < 0 ? Math.PI : 0);
        const ang = Math.sin(p) * amt;
        const ex = Math.sin(ang) * UPPER, ey = Math.cos(ang) * UPPER;
        const fa = ang + 0.35;
        seg(ex, ey, ex + Math.sin(fa) * FORE, ey + Math.cos(fa) * FORE);
      }
    }

    // ===== CAP ===== (fără față)
    ctx.beginPath(); ctx.arc(headX, headY, headR, 0, Math.PI * 2);
    if (c.hollowHead) ctx.stroke(); else ctx.fill();

    // coroană (regele portocaliu)
    if (c.crown) {
      const cw = headR * 1.4, ch = headR * 0.7, ty = headY - headR + 2;
      ctx.save();
      ctx.fillStyle = "#ffd23f"; ctx.strokeStyle = "#b7860b"; ctx.lineWidth = 2; ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(headX - cw / 2, ty);
      ctx.lineTo(headX - cw / 2, ty - ch * 0.5);
      ctx.lineTo(headX - cw / 4, ty - ch * 0.15);
      ctx.lineTo(headX, ty - ch);
      ctx.lineTo(headX + cw / 4, ty - ch * 0.15);
      ctx.lineTo(headX + cw / 2, ty - ch * 0.5);
      ctx.lineTo(headX + cw / 2, ty);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }

  legIK(ctx, hipX, hipY, footX, footY, bend) {
    const k = solveIK(hipX, hipY, footX, footY, THIGH, SHIN, bend);
    ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(k.x, k.y); ctx.lineTo(footX, footY); ctx.stroke();
  }

  drawFx(ctx) {
    const feetY = Math.round(groundY);
    const x = Math.round(this.x);
    const headTopScreen = feetY - 150;

    // stele
    if (this.stars.length && this.recoil > 1) {
      ctx.save(); ctx.fillStyle = "#ffd23f";
      const cy = feetY - 96 - this.c.headR;
      this.stars.forEach(s => star(ctx, x + Math.cos(s.ang) * s.r, cy + Math.sin(s.ang) * s.r * 0.6, 6));
      ctx.restore();
    }
    // flăcări
    if (this.burning) {
      ctx.save();
      const cols = ["#ff6a12", "#ff9a2e", "#ffd23f"];
      for (let i = 0; i < 6; i++) {
        const fx = x + (i - 2.5) * 8;
        const fbase = feetY - (i % 2 ? 76 : 52);
        const fh = 22 + Math.sin(frame * 0.5 + i * 1.3) * 10;
        ctx.fillStyle = cols[i % 3];
        ctx.beginPath(); ctx.moveTo(fx - 6, fbase); ctx.quadraticCurveTo(fx, fbase - fh, fx + 6, fbase); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    // găleată + apă
    if (this.waterAnim > 0) {
      ctx.save();
      const bx = x + 22;
      ctx.strokeStyle = "#aeb4d0"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(bx - 9, feetY - 22); ctx.lineTo(bx - 7, feetY - 6); ctx.lineTo(bx + 7, feetY - 6); ctx.lineTo(bx + 9, feetY - 22); ctx.stroke();
      ctx.globalAlpha = Math.min(1, this.waterAnim / 45);
      ctx.fillStyle = "#3b7dd8";
      ctx.beginPath(); ctx.ellipse(x, feetY - 3, 28, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1; ctx.restore();
    }
    // mesaj — deasupra capului în orice stare
    if (this.say) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.say.ttl / 35);
      ctx.fillStyle = this.c.color; ctx.font = "700 17px 'Segoe UI', sans-serif"; ctx.textAlign = "center";
      ctx.shadowColor = this.c.color; ctx.shadowBlur = 10;
      const topOff = 118 + 2 * this.c.headR;
      let sx = x, sy = feetY - topOff;
      if (this.lie > 0) sy = feetY - 55;
      if (this.state === "held") { sx = pointer.x; sy = Math.min(this.heldY, groundY) - topOff; }
      else if (this.state === "thrown") { sy = (groundY - this.tz) - topOff; }
      const lines = wrapText(this.say.text, 28), lh = 19;
      const startY = sy - (lines.length - 1) * lh;
      lines.forEach((ln, i) => ctx.fillText(ln, sx, startY + i * lh));
      ctx.restore();
    }

    // marcaj provocator (selectat prin dublu-click)
    if (challenger === this && this.state !== "held") {
      ctx.save();
      ctx.font = "20px serif"; ctx.textAlign = "center";
      ctx.fillText("⚔️", x, feetY - (128 + 2 * this.c.headR) + Math.sin(frame * 0.15) * 3);
      ctx.restore();
    }
  }
}

function star(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = (Math.PI * 2 * i) / 5 - Math.PI / 2, a2 = a + Math.PI / 5;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    ctx.lineTo(x + Math.cos(a2) * r * 0.45, y + Math.sin(a2) * r * 0.45);
  }
  ctx.closePath(); ctx.fill();
}

// ---------- Scenă ----------
const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d");
let W = 0, H = 0, agents = [];
let fightCheck = 300;
let frame = 0;
let adventureCd = rand(1800, 4200);
let chromeAutoCd = rand(2400, 5400); // ei deschid Chrome singuri din când în când
let expedition = null;      // {place, activity}
let showHitboxes = false;
let taskIcons = [];         // iconițele din taskbar (pt. click)
let browserWin = null;      // fereastra Chrome deschisă
let stopwatchWin = null;    // fereastra cronometru
const VIDEOS = [
  "Cea mai tare cascadorie 😱", "10 lucruri pe care nu le știai", "Pisici amuzante compilație 🐱",
  "Cum să construiești în Minecraft ⛏️", "Cel mai bun montaj LoL 🎮", "Stick figure fights! 🔥",
  "Muzică chill pentru relaxat 🎧", "Speedrun record mondial", "Tutorial redstone avansat",
  "REACȚIE la videoul ăsta 😮", "Top 5 momente epice", "El a construit ASTA în 24h",
];
const pointer = { x: -999, y: -999, px: -999, py: -999, down: false, downX: 0, downY: 0, cand: null, grabbed: null, moved: 0 };
let challenger = null;                        // primul ales prin dublu-click
let lastClick = { agent: null, time: 0 };     // pt. detectarea dublu-click-ului

function resize() {
  const dpr = window.devicePixelRatio || 1;
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.width = W + "px"; canvas.style.height = H + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  groundY = Math.max(180, H - 90);
}

function initAgents() { agents = CHARACTERS.map(c => new Agent(c, W)); }

function nearestAgent(cx, cy) {
  let best = null, bestD = 1e9;
  for (const a of agents) {
    if (a.away) continue;
    const torsoY = groundY - 70, headY = groundY - 100 - a.c.headR;
    const d = Math.min(Math.hypot(a.x - cx, torsoY - cy), Math.hypot(a.x - cx, headY - cy));
    if (d < bestD) { bestD = d; best = a; }
  }
  return (best && bestD < 90) ? best : null;
}

// ---- interacțiune: click = lovitură, ține & trage = apucă și aruncă, dreapta = chat ----
window.addEventListener("mousedown", (e) => {
  if (e.button !== 0) return;
  pointer.down = true; pointer.downX = e.clientX; pointer.downY = e.clientY; pointer.moved = 0;
  pointer.cand = nearestAgent(e.clientX, e.clientY);
});
window.addEventListener("mousemove", (e) => {
  pointer.px = pointer.x; pointer.py = pointer.y; pointer.x = e.clientX; pointer.y = e.clientY;
  if (pointer.down) {
    pointer.moved += Math.hypot(pointer.x - pointer.px, pointer.y - pointer.py);
    if (!pointer.grabbed && pointer.cand && pointer.moved > 8) {
      pointer.grabbed = pointer.cand; pointer.grabbed.grab();
    }
    if (pointer.grabbed) pointer.grabbed.heldY = Math.min(pointer.y, groundY); // nu-l băga în pământ
  }
});
window.addEventListener("mouseup", (e) => {
  if (e.button !== 0) return;
  if (pointer.grabbed) {
    const vx = pointer.x - pointer.px, vy = pointer.y - pointer.py;
    pointer.grabbed.release(vx * 1.3, vy * 1.3);
  } else if (pointer.moved < 8 && handleUIClick(pointer.x, pointer.y)) {
    // consumat de taskbar / fereastra Chrome
  } else if (pointer.cand && pointer.moved < 8) {
    const a = pointer.cand, now = performance.now();
    if (lastClick.agent === a && now - lastClick.time < 350) { fightSelect(a); lastClick.agent = null; } // dublu-click
    else { a.getHit(pointer.x); lastClick = { agent: a, time: now }; }
  }
  pointer.down = false; pointer.cand = null; pointer.grabbed = null;
});

function handleUIClick(x, y) {
  // cronometru
  if (stopwatchWin) {
    const s = stopwatchWin;
    if (s._xb) { const b = s._xb; if (x >= b.x && x <= b.x + b.s && y >= b.y && y <= b.y + b.s) { closeStopwatch(); return true; } }
    if (s._btns) for (const b of s._btns) { if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { swBtn(b.id); return true; } }
    if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return true;
  }
  // Chrome
  if (browserWin && browserWin._xb) { const b = browserWin._xb; if (x >= b.x && x <= b.x + b.s && y >= b.y && y <= b.y + b.s) { closeChrome(); return true; } }
  if (browserWin) { const b = browserWin; if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return true; }
  for (const ic of taskIcons) { if (Math.abs(x - ic.cx) <= ic.s / 2 && Math.abs(y - ic.cy) <= ic.s / 2) { iconAction(ic.name); return true; } }
  return false;
}
function iconAction(name) {
  if (name === "chrome" || name === "search") openChrome();
  else if (name === "minecraft") triggerBuild();
  else if (name === "lol") triggerRandomFight();
  else if (name === "stopwatch") openStopwatch();
  else if (name === "start") pick([openChrome, triggerBuild, triggerRandomFight])();
}

// ---- Cronometru ----
function openStopwatch() {
  const w = 240, h = 172;
  stopwatchWin = { x: Math.max(12, Math.round(W / 2 - w / 2) - 150), y: 66, w, h, running: false, accMs: 0, startT: 0 };
}
function closeStopwatch() { stopwatchWin = null; }
function swElapsed(s) { return s.accMs + (s.running ? performance.now() - s.startT : 0); }
function fmtTime(ms) {
  const total = Math.floor(ms), m = Math.floor(total / 60000), sec = Math.floor((total % 60000) / 1000), cs = Math.floor((total % 1000) / 10);
  return String(m).padStart(2, "0") + ":" + String(sec).padStart(2, "0") + "." + String(cs).padStart(2, "0");
}
function swBtn(id) {
  const s = stopwatchWin; if (!s) return;
  if (id === "start") { if (!s.running) { s.startT = performance.now(); s.running = true; } }
  else if (id === "stop") { if (s.running) { s.accMs += performance.now() - s.startT; s.running = false; } }
  else if (id === "reset") { s.accMs = 0; s.running = false; }
}
function drawStopwatch() {
  if (!stopwatchWin) return;
  const s = stopwatchWin;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.55)"; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
  ctx.fillStyle = "#202124"; rr(s.x, s.y, s.w, s.h, 12); ctx.fill();
  ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.fillStyle = "#35363a"; rr(s.x, s.y, s.w, 28, 12); ctx.fill(); ctx.fillRect(s.x, s.y + 16, s.w, 12);
  ctx.fillStyle = "#e8ecff"; ctx.font = "12px 'Segoe UI', sans-serif"; ctx.textAlign = "left"; ctx.fillText("⏱ Cronometru", s.x + 12, s.y + 19);
  const xb = { x: s.x + s.w - 24, y: s.y + 6, s: 18 }; s._xb = xb;
  const hov = pointer.x >= xb.x && pointer.x <= xb.x + xb.s && pointer.y >= xb.y && pointer.y <= xb.y + xb.s;
  ctx.fillStyle = hov ? "#e81123" : "#4a4b50"; rr(xb.x, xb.y, xb.s, xb.s, 5); ctx.fill();
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(xb.x + 5, xb.y + 5); ctx.lineTo(xb.x + xb.s - 5, xb.y + xb.s - 5); ctx.moveTo(xb.x + xb.s - 5, xb.y + 5); ctx.lineTo(xb.x + 5, xb.y + xb.s - 5); ctx.stroke();
  ctx.fillStyle = s.running ? "#7ee6a0" : "#e8ecff"; ctx.font = "bold 32px 'Consolas', monospace"; ctx.textAlign = "center";
  ctx.fillText(fmtTime(swElapsed(s)), s.x + s.w / 2, s.y + 92);
  const by = s.y + s.h - 44, bw = (s.w - 40) / 3, bh = 32;
  s._btns = [
    { id: "start", label: "▶ Start", col: "#2e7d46", x: s.x + 12, y: by, w: bw, h: bh },
    { id: "stop", label: "⏹ Stop", col: "#a83232", x: s.x + 16 + bw, y: by, w: bw, h: bh },
    { id: "reset", label: "↺ Reset", col: "#3a3f52", x: s.x + 20 + bw * 2, y: by, w: bw, h: bh },
  ];
  ctx.textBaseline = "middle";
  for (const b of s._btns) { ctx.fillStyle = b.col; rr(b.x, b.y, b.w, b.h, 8); ctx.fill(); ctx.fillStyle = "#fff"; ctx.font = "12px 'Segoe UI', sans-serif"; ctx.textAlign = "center"; ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2); }
  ctx.textBaseline = "alphabetic";
  ctx.restore();
}
function openChrome(auto) {
  const w = Math.min(500, W - 60), h = Math.min(320, groundY - 50);
  browserWin = { x: Math.round(W / 2 - w / 2), y: 36, w, h, title: pick(VIDEOS), views: (Math.random() * 9 + 0.3).toFixed(1) + "M", t0: frame, dur: rand(780, 1320) }; // videoul ține ~13-22s apoi se închide
  const avail = agents.filter(a => a.state === "walk" || a.state === "idle" || a.state === "scared");
  avail.forEach((a, i) => { a.state = "watch"; a.lie = 0; a.sleepPhase = null; a.jumping = false; if (a.opponent) a.endFight(); a.watchTarget = browserWin.x + w * 0.12 + i * (w * 0.76) / Math.max(1, avail.length - 1); });
}
function closeChrome() {
  browserWin = null;
  agents.forEach(a => { if (a.state === "watch") { a.state = "walk"; a.targetX = null; a.stateTimer = rand(40, 120); a.speak(pick(["Gata!", "Tare a fost!", "Mai vreau!"]), 70); } });
}
function triggerBuild() {
  const cands = agents.filter(x => (x.state === "walk" || x.state === "idle") && x.builtCount < 2);
  if (!cands.length || structures.length >= 8) return;
  const a = pick(cands), type = pick(["house", "tower", "tree", "campfire"]);
  a.state = "build"; a.buildDur = rand(340, 480); a.buildTimer = a.buildDur;
  const s = { x: a.x, color: a.c.color, progress: 0, type }; structures.push(s); a.building = s; a.builtCount++;
  a.speak(pick(["Construiesc!", "Minecraft!"]), 120);
}
function triggerRandomFight() {
  const av = agents.filter(x => x.state === "walk" || x.state === "idle");
  if (av.length < 2) return;
  const a = pick(av), b = pick(av.filter(x => x !== a));
  if (b) startFightBetween(a, b);
}
function rr(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
function drawBrowser() {
  if (!browserWin) return;
  const b = browserWin;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.55)"; ctx.shadowBlur = 26; ctx.shadowOffsetY = 10;
  ctx.fillStyle = "#202124"; rr(b.x, b.y, b.w, b.h, 12); ctx.fill();
  ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.fillStyle = "#35363a"; rr(b.x, b.y, b.w, 30, 12); ctx.fill(); ctx.fillRect(b.x, b.y + 18, b.w, 12);
  ctx.fillStyle = "#202124"; rr(b.x + 10, b.y + 7, 150, 22, 7); ctx.fill();
  ctx.fillStyle = "#e8ecff"; ctx.font = "12px 'Segoe UI', sans-serif"; ctx.textAlign = "left"; ctx.fillText("▶ YouTube", b.x + 20, b.y + 22);
  const xb = { x: b.x + b.w - 26, y: b.y + 7, s: 20 }; b._xb = xb;
  const hover = pointer.x >= xb.x && pointer.x <= xb.x + xb.s && pointer.y >= xb.y && pointer.y <= xb.y + xb.s;
  ctx.fillStyle = hover ? "#e81123" : "#4a4b50"; rr(xb.x, xb.y, xb.s, xb.s, 5); ctx.fill();
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(xb.x + 6, xb.y + 6); ctx.lineTo(xb.x + xb.s - 6, xb.y + xb.s - 6); ctx.moveTo(xb.x + xb.s - 6, xb.y + 6); ctx.lineTo(xb.x + 6, xb.y + xb.s - 6); ctx.stroke();
  ctx.fillStyle = "#2a2b2e"; rr(b.x + 10, b.y + 36, b.w - 20, 22, 11); ctx.fill();
  ctx.fillStyle = "#9aa0b0"; ctx.font = "12px 'Segoe UI', sans-serif"; ctx.fillText("🔒 youtube.com/watch — " + b.title.slice(0, 28), b.x + 22, b.y + 51);
  const vx = b.x + 12, vy = b.y + 66, vw = b.w - 24, vh = b.h - 66 - 42;
  ctx.fillStyle = "#000"; ctx.fillRect(vx, vy, vw, vh);
  const bars = 18, bw = vw / bars * 0.62, t = frame * 0.15;
  for (let i = 0; i < bars; i++) { const bh2 = (0.2 + 0.8 * Math.abs(Math.sin(t + i * 0.55))) * vh * 0.55; ctx.fillStyle = `hsl(${(i * 20 + frame) % 360},70%,55%)`; ctx.fillRect(vx + i * vw / bars + vw / bars * 0.19, vy + vh / 2 - bh2 / 2, bw, bh2); }
  ctx.fillStyle = "rgba(255,255,255,0.85)"; const px = vx + vw / 2, py = vy + vh / 2, pr = vh * 0.13; ctx.beginPath(); ctx.moveTo(px - pr * 0.6, py - pr); ctx.lineTo(px - pr * 0.6, py + pr); ctx.lineTo(px + pr, py); ctx.closePath(); ctx.fill();
  const prog = clamp((frame - b.t0) / b.dur, 0, 1);
  ctx.fillStyle = "#555"; ctx.fillRect(vx, vy + vh - 4, vw, 4); ctx.fillStyle = "#ff0000"; ctx.fillRect(vx, vy + vh - 4, vw * prog, 4);
  ctx.fillStyle = "#e8ecff"; ctx.font = "bold 14px 'Segoe UI', sans-serif"; ctx.fillText(b.title, b.x + 12, vy + vh + 22);
  ctx.fillStyle = "#9aa0b0"; ctx.font = "12px 'Segoe UI', sans-serif"; ctx.fillText("▶ " + b.views + " vizualizări · gașca se uită", b.x + 12, vy + vh + 38);
  ctx.restore();
}

// dublu-click pe unul, apoi pe altul → se luptă
function fightSelect(a) {
  if (a.away || a.state === "held" || a.state === "thrown") return;
  if (challenger && (challenger.away || challenger.state === "held" || challenger.state === "thrown")) challenger = null;
  if (challenger === a) { challenger = null; a.speak("...", 40); return; }
  if (!challenger) { challenger = a; a.lie = 0; a.sleepPhase = null; a.speak("Cine mă provoacă?", 100); }
  else { startFightBetween(challenger, a); challenger = null; }
}
function startFightBetween(a, b) {
  for (const x of [a, b]) { x.lie = 0; x.sleepPhase = null; x.jumping = false; x.building = null; if (x.opponent) x.endFight(); }
  a.startFight(b);
  b.opponent = a; b.state = "fight"; b.stateTimer = a.stateTimer; b.attacker = false; b.speak(pick(b.c.fightLines), 90);
}
// touch: tap = lovitură (fără drag pt. simplitate)
window.addEventListener("touchstart", (e) => { const t = e.touches[0]; if (t) { pointer.x = t.clientX; pointer.y = t.clientY; const a = nearestAgent(t.clientX, t.clientY); if (a) a.getHit(t.clientX); } }, { passive: true });
window.addEventListener("contextmenu", (e) => { e.preventDefault(); const a = nearestAgent(e.clientX, e.clientY); if (a && window.openChat) window.openChat(a); });

// aventură
function avail(a) { return !a.away && !a.chatting && a.state !== "sleep" && a.state !== "leaving" && a.state !== "held" && a.state !== "thrown" && a.state !== "scared"; }
function startAdventure() {
  const orange = agents.find(a => a.c.id === "orange");
  if (!orange || !avail(orange)) return;
  const others = agents.filter(a => a !== orange && avail(a));
  if (others.length < 2) return; // lasă mereu 1-2 acasă
  const stay = Math.min(others.length - 1, 1 + (Math.random() < 0.5 ? 1 : 0)); // 1 sau 2 rămân
  const shuffled = [...others].sort(() => Math.random() - 0.5);
  const followers = shuffled.slice(0, others.length - stay);
  if (followers.length === 0) return;
  const side = Math.random() < 0.5 ? -1 : 1, exitX = side < 0 ? -120 : W + 120;
  const PLACES = ["Muntele Pixel", "Peștera Redstone", "Pădurea Întunecată", "Insula Cuburilor", "Tărâmul Animatorului", "Deșertul de Nisip", "Castelul din Nori"];
  const ACTS = ["caută comori", "luptă cu un dragon", "explorează o peșteră", "construiesc o bază secretă", "salvează un cub pierdut", "adună diamante"];
  expedition = { place: pick(PLACES), activity: pick(ACTS), duration: rand(3600, 18000) }; // 1-5 min
  orange.speak("Aventură!", 160); if (orange.opponent) orange.endFight();
  followers.forEach(f => { if (f.opponent) f.endFight(); f.speak("Hai!", 130); });
  [orange, ...followers].forEach((a, i) => setTimeoutLeave(a, exitX, 30 + i * 18));
}
const _pending = [];
function setTimeoutLeave(a, exitX, delay) { _pending.push({ a, exitX, t: delay }); }

window.recallAdventurers = function () {
  _pending.length = 0;
  let n = 0;
  for (const a of agents) {
    if (a.away) { a.awayTimer = 1; n++; }
    else if (a.state === "leaving") { a.returnFromAdventure(W); n++; }
  }
  expedition = null;
  return n;
};

// întoarce un singur membru (după nume)
window.recallOne = function (name) {
  const a = agents.find(x => x.c.name === name && (x.away || x.state === "leaving"));
  if (!a) return false;
  for (let i = _pending.length - 1; i >= 0; i--) if (_pending[i].a === a) _pending.splice(i, 1);
  if (a.away) a.awayTimer = 1;
  else if (a.state === "leaving") a.returnFromAdventure(W);
  if (!agents.some(x => x.adventure && (x.away || x.state === "leaving"))) expedition = null;
  return true;
};

// info expediție pentru buton
window.getExpedition = function () {
  const members = agents.filter(a => a.adventure && (a.away || a.state === "leaving"));
  if (members.length === 0 || !expedition) return { active: false };
  const awayM = members.filter(m => m.away);
  const rem = awayM.length ? Math.max(...awayM.map(m => m.awayTimer)) : null;
  return {
    active: true,
    names: members.map(m => m.c.name),
    members: members.map(m => ({ name: m.c.name, color: m.c.color, hollowHead: !!m.c.hollowHead, crown: !!m.c.crown })),
    place: expedition.place, activity: expedition.activity,
    remaining: rem === null ? null : Math.round(rem / 60),
  };
};

// trimite gașca în expediție manual (din buton)
window.triggerExpedition = function () {
  const already = agents.some(a => a.adventure && (a.away || a.state === "leaving"));
  if (already) return "already";
  const before = _pending.length;
  startAdventure();
  adventureCd = rand(3600, 9000);
  return _pending.length > before ? "ok" : "busy";
};

// hitbox-uri (tasta H)
window.addEventListener("keydown", (e) => { if (e.key === "h" || e.key === "H") showHitboxes = !showHitboxes; });
function drawHitboxes() {
  ctx.save();
  ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.85;
  ctx.fillStyle = "#fff"; ctx.font = "11px monospace"; ctx.textAlign = "center";
  for (const a of agents) {
    if (a.away) continue;
    const sleeping = a.state === "sleep" && a.lie > 0.3;
    const half = sleeping ? 74 : 19;
    const bodyH = sleeping ? 34 : (104 + 2 * a.c.headR);
    let cx = a.x, baseY = groundY;
    if (a.state === "held") { cx = pointer.x; baseY = Math.min(pointer.y, groundY); }
    else if (a.state === "thrown") { baseY = groundY - a.tz; }
    ctx.strokeRect(cx - half, baseY - bodyH, half * 2, bodyH);
    ctx.fillText(a.c.name, cx, baseY - bodyH - 5);
  }
  ctx.restore();
}

function maybeStartFight() {
  if (fightCheck-- > 0) return;
  fightCheck = rand(500, 1100);
  const free = agents.filter(a => !a.chatting && !a.away && (a.state === "walk" || a.state === "idle"));
  if (free.length < 2) return;
  for (let i = 0; i < free.length; i++)
    for (let j = i + 1; j < free.length; j++)
      if (Math.abs(free[i].x - free[j].x) < 340 && Math.random() < 0.6) {
        free[i].startFight(free[j]);
        free[j].opponent = free[i]; free[j].state = "fight"; free[j].stateTimer = free[i].stateTimer; free[j].attacker = false;
        return;
      }
}

// pământul = taskbar Windows cu iconițe (Search, Chrome, Minecraft, League of Legends)
function drawTaskbar() {
  const bh = H - groundY;
  ctx.fillStyle = "#191b24"; ctx.fillRect(0, groundY, W, bh);
  ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(W, groundY); ctx.stroke();
  const s = Math.min(48, bh - 30);
  const icons = [["search", drawSearchIcon], ["chrome", drawChromeIcon], ["minecraft", drawMinecraftIcon], ["lol", drawLoLIcon], ["stopwatch", drawStopwatchIcon]];
  const gap = s * 0.55;
  const totalW = icons.length * s + (icons.length - 1) * gap;
  const cy = groundY + bh / 2 + 2;
  let cx = W / 2 - totalW / 2 + s / 2;
  taskIcons = [];
  for (const [name, fn] of icons) { fn(cx, cy, s); taskIcons.push({ name, cx, cy, s }); cx += s + gap; }
  // Start (stânga)
  const ss = s * 0.72, sx = 24 + ss / 2;
  drawStartIcon(sx, cy, ss); taskIcons.push({ name: "start", cx: sx, cy, s: ss });
  // ceas (dreapta)
  drawClock(W - 14, cy);
}
function drawStartIcon(cx, cy, s) {
  const q = s * 0.4, g = s * 0.12; ctx.fillStyle = "#4aa3ff";
  const x0 = cx - q - g / 2, y0 = cy - q - g / 2;
  ctx.fillRect(x0, y0, q, q); ctx.fillRect(x0 + q + g, y0, q, q);
  ctx.fillRect(x0, y0 + q + g, q, q); ctx.fillRect(x0 + q + g, y0 + q + g, q, q);
}
function drawClock(rx, cy) {
  const d = new Date();
  const time = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  const date = String(d.getDate()).padStart(2, "0") + "." + String(d.getMonth() + 1).padStart(2, "0") + "." + d.getFullYear();
  ctx.save(); ctx.textAlign = "right";
  ctx.fillStyle = "#e8ecff"; ctx.font = "13px 'Segoe UI', sans-serif"; ctx.fillText(time, rx, cy - 1);
  ctx.fillStyle = "#9aa0b0"; ctx.font = "11px 'Segoe UI', sans-serif"; ctx.fillText(date, rx, cy + 14);
  ctx.restore();
}
function iconBg(cx, cy, s, fill) { ctx.fillStyle = fill; ctx.beginPath(); if (ctx.roundRect) { ctx.roundRect(cx - s / 2, cy - s / 2, s, s, s * 0.22); } else { ctx.rect(cx - s / 2, cy - s / 2, s, s); } ctx.fill(); }
function drawSearchIcon(cx, cy, s) {
  iconBg(cx, cy, s, "#2b2e3a");
  const r = s * 0.2; ctx.strokeStyle = "#e8ecff"; ctx.lineWidth = Math.max(2, s * 0.06); ctx.lineCap = "round";
  ctx.beginPath(); ctx.arc(cx - s * 0.07, cy - s * 0.07, r, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + s * 0.08, cy + s * 0.08); ctx.lineTo(cx + s * 0.22, cy + s * 0.22); ctx.stroke();
}
function drawChromeIcon(cx, cy, s) {
  const r = s / 2 * 0.94; ctx.save(); ctx.translate(cx, cy);
  const cols = ["#ea4335", "#34a853", "#fbbc05"];
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, (i * 120 - 90) * Math.PI / 180, ((i + 1) * 120 - 90) * Math.PI / 180); ctx.closePath(); ctx.fillStyle = cols[i]; ctx.fill(); }
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#4285f4"; ctx.beginPath(); ctx.arc(0, 0, r * 0.42, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function drawMinecraftIcon(cx, cy, s) {
  const q = s * 0.9, x0 = cx - q / 2, y0 = cy - q / 2;
  ctx.fillStyle = "#7a5a3a"; ctx.fillRect(x0, y0, q, q);           // pământ
  ctx.fillStyle = "#5aab3a"; ctx.fillRect(x0, y0, q, q * 0.34);     // iarbă
  ctx.fillStyle = "rgba(0,0,0,0.16)";
  const p = q / 4;
  ctx.fillRect(x0 + p, y0 + q * 0.45, p * 0.8, p * 0.8);
  ctx.fillRect(x0 + p * 2.4, y0 + q * 0.66, p * 0.8, p * 0.8);
  ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.fillRect(x0 + p * 2, y0 + q * 0.05, p * 0.8, p * 0.6);
  ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 1.5; ctx.strokeRect(x0, y0, q, q);
}
function drawLoLIcon(cx, cy, s) {
  iconBg(cx, cy, s, "#091428");
  ctx.strokeStyle = "#c8963c"; ctx.lineWidth = Math.max(1.5, s * 0.04);
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(cx - s / 2 + 1, cy - s / 2 + 1, s - 2, s - 2, s * 0.2); ctx.stroke(); }
  ctx.fillStyle = "#c89b3c"; ctx.font = `bold ${Math.round(s * 0.4)}px Georgia, serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("LoL", cx, cy + 1);
  ctx.textBaseline = "alphabetic";
}
function drawStopwatchIcon(cx, cy, s) {
  iconBg(cx, cy, s, "#2b2e3a");
  const r = s * 0.28, ccy = cy + s * 0.05;
  ctx.strokeStyle = "#e8ecff"; ctx.lineWidth = Math.max(2, s * 0.05); ctx.lineCap = "round";
  ctx.beginPath(); ctx.arc(cx, ccy, r, 0, Math.PI * 2); ctx.stroke();          // corp
  ctx.beginPath(); ctx.moveTo(cx - s * 0.08, ccy - r - s * 0.08); ctx.lineTo(cx + s * 0.08, ccy - r - s * 0.08); ctx.stroke(); // buton sus
  ctx.beginPath(); ctx.moveTo(cx, ccy - r - s * 0.02); ctx.lineTo(cx, ccy - r - s * 0.1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, ccy); ctx.lineTo(cx, ccy - r * 0.6); ctx.moveTo(cx, ccy); ctx.lineTo(cx + r * 0.5, ccy + r * 0.2); ctx.stroke(); // ace
}

function blk(x, y, s, fill) {
  ctx.fillStyle = fill; ctx.fillRect(x, y, s, s);
  ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
}

// construcții din blocuri stil Minecraft, cresc de jos în sus cu progresul
function drawStructure(s) {
  const B = 15, x = s.x, base = groundY, p = s.progress, col = s.color;
  const put = (cx, cy, fill) => blk(x + cx * B - B / 2, base - (cy + 1) * B, B, fill);

  if (s.type === "house") {
    const cols = 8, rows = 6, maxRow = 9, shown = Math.ceil(p * maxRow);
    for (let ry = 0; ry < rows; ry++) for (let cx = 0; cx < cols; cx++) {
      if (ry >= shown) continue;
      if (ry < 2 && (cx === 3 || cx === 4)) continue; // ușă
      const border = (ry === 0 || cx === 0 || cx === cols - 1 || ry === rows - 1);
      put(cx - cols / 2, ry, shade(col, border ? 0.95 : 0.6));
    }
    for (const [ry, hw] of [[6, 3], [7, 2], [8, 1]]) { if (ry >= shown) continue; for (let cx = -hw; cx < hw; cx++) put(cx, ry, shade(col, 0.78)); }
  }
  else if (s.type === "tower") {
    const cols = 4, rows = 10, maxRow = 11, shown = Math.ceil(p * maxRow);
    for (let ry = 0; ry < rows; ry++) for (let cx = 0; cx < cols; cx++) {
      if (ry >= shown) continue;
      if (ry === 5 && (cx === 1 || cx === 2)) continue; // fereastră
      const border = (ry === 0 || cx === 0 || cx === cols - 1);
      put(cx - cols / 2, ry, shade(col, border ? 0.95 : 0.6));
    }
    if (shown > rows) for (let cx = 0; cx < cols; cx++) if (cx % 2 === 0) put(cx - cols / 2, rows, shade(col, 0.95));
  }
  else if (s.type === "tree") {
    const shown = Math.ceil(p * 9);
    for (let ry = 0; ry < 4; ry++) if (ry < shown) put(0, ry, shade("#6b4a2b", ry % 2 ? 0.95 : 0.7));
    const blob = [[-2, 4], [-1, 4], [0, 4], [1, 4], [-2, 5], [-1, 5], [0, 5], [1, 5], [-2, 6], [-1, 6], [0, 6], [1, 6], [-1, 7], [0, 7]];
    for (const [cx, cy] of blob) if (cy < shown) put(cx, cy, shade("#3fa845", ((cx + cy) & 1) ? 0.9 : 0.65));
  }
  else if (s.type === "campfire") {
    if (p > 0.2) { put(-1, 0, shade("#6b4a2b", 0.85)); put(0, 0, shade("#6b4a2b", 0.6)); put(1, 0, shade("#6b4a2b", 0.95)); }
    if (s.out) { // stins cu apă → abur, dispare
      ctx.save();
      ctx.globalAlpha = Math.max(0, s.outTimer / 300);
      ctx.fillStyle = "#3b7dd8"; ctx.beginPath(); ctx.ellipse(x, base - 6, 26, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(220,230,245,0.55)";
      for (let i = 0; i < 3; i++) { const sy = base - B - ((frame * 1.5 + i * 22) % 44); ctx.beginPath(); ctx.arc(x + (i - 1) * 8, sy, 4, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    } else if (p > 0.4) {
      const rp = Math.min(1, (p - 0.4) / 0.6), fl = (30 + Math.sin(frame * 0.3) * 8) * rp, fb = base - B;
      ctx.save();
      ctx.fillStyle = "#ff9a2e"; ctx.beginPath(); ctx.moveTo(x - 14, fb); ctx.quadraticCurveTo(x - 4, fb - fl * 0.6, x, fb - fl); ctx.quadraticCurveTo(x + 4, fb - fl * 0.6, x + 14, fb); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#ffd23f"; ctx.beginPath(); ctx.moveTo(x - 6, fb); ctx.quadraticCurveTo(x, fb - fl * 0.75, x + 6, fb); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
}

function drawParticles() {
  ctx.save();
  ctx.fillStyle = "rgba(200,205,230,0.5)";
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.life--;
    ctx.globalAlpha = Math.max(0, p.life / 30) * 0.5;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    if (p.life <= 0) particles.splice(i, 1);
  }
  ctx.restore();
}

function loop() {
  frame++;
  ctx.clearRect(0, 0, W, H);
  drawTaskbar();
  structures.forEach(drawStructure);

  if (adventureCd-- <= 0) { adventureCd = rand(3600, 9000); startAdventure(); }
  for (let i = _pending.length - 1; i >= 0; i--) {
    const p = _pending[i];
    if (--p.t <= 0) { if (!p.a.away) { p.a.state = "leaving"; p.a.exitX = p.exitX; p.a.adventure = true; if (p.a.opponent) p.a.endFight(); } _pending.splice(i, 1); }
  }

  // focuri stinse → dispar după 5s
  for (let i = structures.length - 1; i >= 0; i--) { const s = structures[i]; if (s.out && --s.outTimer <= 0) structures.splice(i, 1); }

  // videoul se termină → Chrome se închide singur; ei deschid Chrome singuri (rar)
  if (browserWin && frame - browserWin.t0 >= browserWin.dur) closeChrome();
  if (!browserWin) { if (--chromeAutoCd <= 0) { chromeAutoCd = rand(4200, 9000); if (agents.filter(a => a.state === "walk" || a.state === "idle").length >= 2) openChrome(true); } }

  maybeStartFight();
  agents.forEach(a => a.update(W));
  drawParticles();
  // desenează: agenții ținuți în mână deasupra tuturor
  [...agents].sort((a, b) => (a.state === "held" ? 1 : 0) - (b.state === "held" ? 1 : 0) || a.x - b.x).forEach(a => a.draw(ctx));
  drawBrowser();
  drawStopwatch();
  if (showHitboxes) drawHitboxes();
  requestAnimationFrame(loop);
}

window.addEventListener("resize", resize);
resize();
initAgents();
loop();
