// Scenă full-screen: stick-figures cu membre articulate care merg pe pământ.
// Uneori se culcă ~20s (nu se bat). Click stânga = lovitură. Vorbesc rar.

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

let groundY = 0;

class Agent {
  constructor(c, W) {
    this.c = c;
    this.x = rand(120, W - 120);
    this.face = Math.random() < 0.5 ? 1 : -1;
    this.speed = rand(0.55, 0.95);
    this.state = "walk";        // walk | idle | fight | hit | sleep
    this.targetX = null;
    this.walkPhase = Math.random() * Math.PI * 2;
    this.bob = Math.random() * Math.PI * 2;
    this.vx = 0;
    this.stateTimer = rand(60, 200);
    this.hitCooldown = 0;
    this.opponent = null;
    this.punchTimer = 0;
    this.attacker = false;
    this.recoil = 0;
    this.stars = [];
    this.say = null;
    this.chatterTimer = rand(300, 900);
    this.lie = 0;               // 0 = în picioare, 1 = culcat
    this.sleepPhase = null;     // down | rest | up
    this.sleepTimer = 0;
    this.sleepCd = rand(3600, 18000); // ~1-5 min până la primul somn (60fps)
  }

  speak(text, ttl = 120) { this.say = { text, ttl }; }

  getHit(fromX) {
    if (this.hitCooldown > 0) return;
    this.hitCooldown = 40;
    this.state = "hit";
    this.stateTimer = 40;
    this.lie = 0; this.sleepPhase = null;
    this.vx = (this.x >= fromX ? 1 : -1) * 10;
    this.recoil = 16;
    this.stars = [];
    for (let i = 0; i < 4; i++) this.stars.push({ ang: (Math.PI * 2 * i) / 4, r: 30 });
    this.speak(pick(this.c.hitLines), 70);
    if (this.opponent) this.endFight();
  }

  startFight(other) {
    this.state = "fight"; this.opponent = other; this.stateTimer = rand(260, 460);
    this.attacker = true; this.punchTimer = 30;
    this.speak(pick(this.c.fightLines), 90);
  }
  endFight() {
    if (this.opponent) { this.opponent.opponent = null; this.opponent.state = "walk"; this.opponent.stateTimer = rand(60, 160); }
    this.opponent = null; this.state = "walk"; this.stateTimer = rand(60, 160);
  }

  update(W) {
    this.bob += 0.06;
    if (this.hitCooldown > 0) this.hitCooldown--;
    if (this.recoil > 0.5) this.recoil *= 0.85; else this.recoil = 0;
    this.stars.forEach(s => { s.ang += 0.2; s.r *= 0.96; });
    if (this.state !== "sleep") this.sleepCd--;

    // text (rar) + expirare
    if (this.say) { if (--this.say.ttl <= 0) this.say = null; }
    if (--this.chatterTimer <= 0) {
      this.chatterTimer = rand(700, 1500); // ~12-25s între replici
      if (this.state === "walk" || this.state === "idle") this.speak(pick(this.c.chatter), 120);
    }

    if (this.state === "hit") {
      this.x += this.vx; this.vx *= 0.9;
      if (--this.stateTimer <= 0) { this.state = "walk"; this.stateTimer = rand(60, 160); this.targetX = null; }
    }
    else if (this.state === "sleep") {
      if (this.sleepPhase === "down") {
        this.lie = Math.min(1, this.lie + 0.04);
        if (this.lie >= 1) { this.sleepPhase = "rest"; this.sleepTimer = 1200; } // ~20s
      } else if (this.sleepPhase === "rest") {
        if (--this.sleepTimer <= 0) this.sleepPhase = "up";
        else if (!this.say && Math.random() < 0.004) this.speak("Zzz", 110);
      } else {
        this.lie = Math.max(0, this.lie - 0.05);
        if (this.lie <= 0) { this.state = "walk"; this.targetX = null; this.stateTimer = rand(80, 180); }
      }
    }
    else if (this.state === "fight") {
      const o = this.opponent;
      if (!o) { this.state = "walk"; return; }
      const dx = o.x - this.x;
      const d = Math.abs(dx) || 1;
      this.face = dx >= 0 ? 1 : -1;
      if (d > 64) { this.x += Math.sign(dx) * (this.speed + 0.5); this.walkPhase += 0.25; }
      else if (this.attacker && this.punchTimer-- <= 0) {
        this.punchTimer = rand(28, 46);
        o.recoil = 14;
        o.stars = [{ ang: 0, r: 22 }, { ang: 2, r: 22 }, { ang: 4, r: 22 }];
        if (!o.say) o.speak(pick(o.c.hitLines), 45);
        this.attacker = false; o.attacker = true; o.punchTimer = rand(20, 34);
      }
      if (--this.stateTimer <= 0) this.endFight();
    }
    else { // walk / idle
      if (this.targetX === null || this.stateTimer-- <= 0) {
        if (this.sleepCd <= 0) { this.state = "sleep"; this.sleepPhase = "down"; this.lie = 0; this.speak("...", 60); this.sleepCd = rand(14400, 21600); } // ~4-6 min până la următorul
        else if (Math.random() < 0.3) { this.state = "idle"; this.targetX = null; this.stateTimer = rand(60, 140); }
        else { this.state = "walk"; this.targetX = rand(80, W - 80); this.stateTimer = rand(120, 300); }
      }
      if (this.state === "walk" && this.targetX !== null) {
        const dx = this.targetX - this.x;
        if (Math.abs(dx) < 4) this.targetX = null;
        else { this.x += Math.sign(dx) * this.speed; this.face = dx >= 0 ? 1 : -1; this.walkPhase += 0.18; }
      }
    }

    this.x = Math.max(60, Math.min(W - 60, this.x));
  }

  draw(ctx) {
    const c = this.c;
    const walking = (this.state === "walk" || this.state === "fight");
    const feetY = Math.round(groundY);
    const x = Math.round(this.x - (this.recoil || 0) * this.face);

    ctx.save();
    ctx.translate(x, feetY);
    if (this.lie > 0) ctx.rotate(this.lie * (Math.PI / 2)); // se lasă pe pământ
    ctx.scale(this.face, 1); // se orientează spre direcția de mers (nu doar dreapta)

    ctx.strokeStyle = c.color; ctx.fillStyle = c.color;
    ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.lineJoin = "round";

    const headR = c.headR;
    const hipY = -50;
    const breathe = Math.sin(this.bob) * 1.5;
    const shoulderY = hipY - 42 + breathe;
    const headCy = shoulderY - 8 - headR;

    // ---- picioare articulate (șold → genunchi → picior) ----
    const thigh = 25, shin = 25;
    for (const side of [-1, 1]) {
      const p = this.walkPhase + (side < 0 ? 0 : Math.PI);
      const swing = walking ? Math.sin(p) * 0.5 : 0;
      const lift = walking ? Math.max(0, Math.sin(p)) * 0.7 : 0;
      const hipX = side * 3;
      const kneeX = hipX + Math.sin(swing) * thigh;
      const kneeY = hipY + Math.cos(swing) * thigh;
      const shinA = swing - lift;
      const footX = kneeX + Math.sin(shinA) * shin;
      const footY = kneeY + Math.cos(shinA) * shin;
      ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(kneeX, kneeY); ctx.lineTo(footX, footY); ctx.stroke();
    }

    // ---- corp ----
    ctx.beginPath(); ctx.moveTo(0, hipY); ctx.lineTo(0, shoulderY); ctx.stroke();

    // ---- brațe articulate (umăr → cot → mână) ----
    const upper = 20, fore = 18;
    if (this.state === "fight" && this.attacker) {
      // pumn spre față (+x local; scale(face) îl orientează corect)
      ctx.beginPath(); ctx.moveTo(0, shoulderY + 4); ctx.lineTo(20, shoulderY + 2); ctx.lineTo(38, shoulderY - 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, shoulderY + 4); ctx.lineTo(-10, shoulderY + 16); ctx.lineTo(-16, shoulderY + 30); ctx.stroke();
    } else {
      for (const side of [-1, 1]) {
        const p = this.walkPhase + (side < 0 ? Math.PI : 0);
        const swing = walking ? Math.sin(p) * 0.45 : Math.sin(this.bob + side) * 0.1;
        const elbowX = Math.sin(swing) * upper;
        const elbowY = shoulderY + 4 + Math.cos(swing) * upper;
        const foreA = swing + 0.35;
        const handX = elbowX + Math.sin(foreA) * fore;
        const handY = elbowY + Math.cos(foreA) * fore;
        ctx.beginPath(); ctx.moveTo(0, shoulderY + 4); ctx.lineTo(elbowX, elbowY); ctx.lineTo(handX, handY); ctx.stroke();
      }
    }

    // ---- cap ----
    ctx.beginPath();
    ctx.arc(0, headCy, headR, 0, Math.PI * 2);
    if (c.hollowHead) ctx.stroke(); else ctx.fill();

    // ---- stele la lovitură ----
    if (this.stars.length && this.recoil > 1) {
      ctx.fillStyle = "#ffd23f";
      this.stars.forEach(s => star(ctx, Math.cos(s.ang) * s.r, headCy - 8 + Math.sin(s.ang) * s.r * 0.6, 6));
    }

    ctx.restore();

    // ---- mesaj deasupra (în spațiul ecranului, mereu drept) ----
    if (this.say) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.say.ttl / 35);
      ctx.fillStyle = c.color;
      ctx.font = "700 17px 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.shadowColor = c.color; ctx.shadowBlur = 10;
      ctx.fillText(this.say.text, x, feetY - 150 + this.lie * 95);
      ctx.restore();
    }
  }
}

function star(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    const a2 = a + Math.PI / 5;
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

function resize() {
  const dpr = window.devicePixelRatio || 1;
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.width = W + "px"; canvas.style.height = H + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  groundY = Math.max(180, H - 90);
}

function initAgents() { agents = CHARACTERS.map(c => new Agent(c, W)); }

// CLICK stânga = lovitură pe cel mai apropiat stickman
function hitAt(cx, cy) {
  let best = null, bestD = 1e9;
  for (const a of agents) {
    const torsoY = groundY - 70, headY = groundY - 100 - a.c.headR;
    const d = Math.min(Math.hypot(a.x - cx, torsoY - cy), Math.hypot(a.x - cx, headY - cy));
    if (d < bestD) { bestD = d; best = a; }
  }
  if (best && bestD < 80) best.getHit(cx);
}
window.addEventListener("click", (e) => hitAt(e.clientX, e.clientY));
window.addEventListener("touchstart", (e) => { const t = e.touches[0]; if (t) hitAt(t.clientX, t.clientY); }, { passive: true });

function maybeStartFight() {
  if (fightCheck-- > 0) return;
  fightCheck = rand(500, 1100);
  const free = agents.filter(a => a.state === "walk" || a.state === "idle");
  if (free.length < 2) return;
  for (let i = 0; i < free.length; i++)
    for (let j = i + 1; j < free.length; j++)
      if (Math.abs(free[i].x - free[j].x) < 340 && Math.random() < 0.6) {
        free[i].startFight(free[j]);
        free[j].opponent = free[i]; free[j].state = "fight"; free[j].stateTimer = free[i].stateTimer; free[j].attacker = false;
        return;
      }
}

function drawGround() {
  const grad = ctx.createLinearGradient(0, groundY, 0, H);
  grad.addColorStop(0, "rgba(255,255,255,0.10)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, groundY, W, H - groundY);
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(W, groundY); ctx.stroke();
}

function loop() {
  ctx.clearRect(0, 0, W, H);
  drawGround();
  maybeStartFight();
  agents.forEach(a => a.update(W));
  [...agents].sort((a, b) => a.x - b.x).forEach(a => a.draw(ctx));
  requestAnimationFrame(loop);
}

window.addEventListener("resize", resize);
resize();
initAgents();
loop();
