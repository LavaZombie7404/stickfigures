// Scenă full-screen: stick-figures mari care merg pe ecran negru, uneori se iau la
// bătaie, iar mișcarea mouse-ului spre un stickman îl lovește. FĂRĂ text.

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

class Agent {
  constructor(c, W, H) {
    this.c = c;
    this.x = rand(120, W - 120);
    this.y = rand(220, H - 90);
    this.face = Math.random() < 0.5 ? 1 : -1;
    this.speed = rand(0.6, 1.0);
    this.state = "walk";       // walk | idle | fight | hit
    this.target = null;
    this.walkPhase = Math.random() * Math.PI * 2;
    this.bob = Math.random() * Math.PI * 2;
    this.vx = 0; this.vy = 0;
    this.stateTimer = rand(60, 200);
    this.hitCooldown = 0;
    this.opponent = null;
    this.punchTimer = 0;
    this.attacker = false;
    this.recoil = 0;
    this.stars = [];
  }

  getHit(fromX, fromY) {
    if (this.hitCooldown > 0) return;
    this.hitCooldown = 40;
    this.state = "hit";
    this.stateTimer = 40;
    const dx = this.x - fromX, dy = this.y - fromY;
    const d = Math.hypot(dx, dy) || 1;
    this.vx = (dx / d) * 9;
    this.vy = (dy / d) * 5;
    this.recoil = 16;
    this.stars = [];
    for (let i = 0; i < 4; i++) this.stars.push({ ang: (Math.PI * 2 * i) / 4, r: 30 });
    if (this.opponent) this.endFight();
  }

  startFight(other) {
    this.state = "fight"; this.opponent = other; this.stateTimer = rand(260, 460);
    this.attacker = true; this.punchTimer = 30;
  }
  endFight() {
    if (this.opponent) { this.opponent.opponent = null; this.opponent.state = "walk"; this.opponent.stateTimer = rand(60, 160); }
    this.opponent = null; this.state = "walk"; this.stateTimer = rand(60, 160);
  }

  update(W, H) {
    this.bob += 0.06;
    if (this.hitCooldown > 0) this.hitCooldown--;
    if (this.recoil > 0.5) this.recoil *= 0.85; else this.recoil = 0;
    this.stars.forEach(s => { s.ang += 0.2; s.r *= 0.96; });

    if (this.state === "hit") {
      this.x += this.vx; this.y += this.vy;
      this.vx *= 0.9; this.vy *= 0.9;
      if (--this.stateTimer <= 0) { this.state = "walk"; this.stateTimer = rand(60, 160); this.target = null; }
    }
    else if (this.state === "fight") {
      const o = this.opponent;
      if (!o) { this.state = "walk"; return; }
      const dx = o.x - this.x, dy = o.y - this.y;
      const d = Math.hypot(dx, dy) || 1;
      this.face = dx >= 0 ? 1 : -1;
      if (d > 64) { this.x += (dx / d) * (this.speed + 0.5); this.y += (dy / d) * (this.speed + 0.5); this.walkPhase += 0.25; }
      else if (this.attacker && this.punchTimer-- <= 0) {
        this.punchTimer = rand(28, 46);
        o.recoil = 14;
        o.stars = [{ ang: 0, r: 22 }, { ang: 2, r: 22 }, { ang: 4, r: 22 }];
        this.attacker = false; o.attacker = true; o.punchTimer = rand(20, 34);
      }
      if (--this.stateTimer <= 0) this.endFight();
    }
    else { // walk / idle
      if (!this.target || this.stateTimer-- <= 0) {
        if (Math.random() < 0.25) { this.state = "idle"; this.target = null; this.stateTimer = rand(40, 120); }
        else { this.state = "walk"; this.target = { x: rand(80, W - 80), y: rand(200, H - 70) }; this.stateTimer = rand(120, 300); }
      }
      if (this.state === "walk" && this.target) {
        const dx = this.target.x - this.x, dy = this.target.y - this.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < 6) this.target = null;
        else { this.x += (dx / d) * this.speed; this.y += (dy / d) * this.speed; this.face = dx >= 0 ? 1 : -1; this.walkPhase += 0.18; }
      }
    }

    this.x = Math.max(60, Math.min(W - 60, this.x));
    this.y = Math.max(200, Math.min(H - 60, this.y));
  }

  draw(ctx) {
    const c = this.c;
    const walking = (this.state === "walk" || this.state === "fight");
    const bobY = Math.sin(this.bob) * 3;
    const x = Math.round(this.x - (this.recoil || 0) * this.face);
    const groundY = Math.round(this.y);
    const headR = c.headR;
    const hipY = groundY - 48;
    const shoulderY = hipY - 42;
    const headCy = shoulderY - 8 - headR + bobY;

    ctx.save();
    ctx.strokeStyle = c.color;
    ctx.fillStyle = c.color;
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // corp
    ctx.beginPath(); ctx.moveTo(x, shoulderY + bobY); ctx.lineTo(x, hipY); ctx.stroke();

    // cap: Orange gol (contur mai gros), ceilalți umplut
    ctx.beginPath();
    ctx.arc(x, headCy, headR, 0, Math.PI * 2);
    if (c.hollowHead) { ctx.lineWidth = 6; ctx.stroke(); }
    else ctx.fill();

    // brațe
    ctx.lineWidth = 6;
    const swing = Math.sin(this.walkPhase) * (walking ? 14 : 4);
    if (this.state === "fight" && this.attacker) {
      ctx.beginPath(); ctx.moveTo(x, shoulderY + 6 + bobY); ctx.lineTo(x + 34 * this.face, shoulderY + 2 + bobY); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, shoulderY + 6 + bobY); ctx.lineTo(x - 18 * this.face, shoulderY + 26 + bobY); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(x, shoulderY + 6 + bobY); ctx.lineTo(x - 18, shoulderY + 28 + bobY + swing); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, shoulderY + 6 + bobY); ctx.lineTo(x + 18, shoulderY + 28 + bobY - swing); ctx.stroke();
    }

    // picioare
    const legSwing = Math.sin(this.walkPhase) * (walking ? 16 : 3);
    ctx.beginPath(); ctx.moveTo(x, hipY); ctx.lineTo(x - 16 + legSwing, groundY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, hipY); ctx.lineTo(x + 16 - legSwing, groundY); ctx.stroke();

    // stele la lovitură
    if (this.stars.length && this.recoil > 1) {
      ctx.fillStyle = "#ffd23f";
      this.stars.forEach(s => {
        star(ctx, x + Math.cos(s.ang) * s.r, headCy - 8 + Math.sin(s.ang) * s.r * 0.6, 6);
      });
    }

    ctx.restore();
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
const mouse = { x: -999, y: -999, px: -999, py: -999 };
let fightCheck = 300;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.width = W + "px"; canvas.style.height = H + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function initAgents() { agents = CHARACTERS.map(c => new Agent(c, W, H)); }

// mouse spre stickman = lovire (centru la ~mijlocul corpului)
window.addEventListener("mousemove", (e) => {
  mouse.px = mouse.x; mouse.py = mouse.y;
  mouse.x = e.clientX; mouse.y = e.clientY;
  const mvx = mouse.x - mouse.px, mvy = mouse.y - mouse.py;
  const mspeed = Math.hypot(mvx, mvy);
  if (mspeed < 2) return;
  for (const a of agents) {
    const dx = a.x - mouse.x, dy = (a.y - 70) - mouse.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 90) {
      const dot = (mvx * dx + mvy * dy) / (mspeed * (dist || 1));
      if (dot > 0.2) a.getHit(mouse.px, mouse.py);
    }
  }
});
window.addEventListener("touchmove", (e) => {
  const t = e.touches[0]; if (!t) return;
  mouse.px = mouse.x; mouse.py = mouse.y; mouse.x = t.clientX; mouse.y = t.clientY;
  for (const a of agents) if (Math.hypot(a.x - mouse.x, (a.y - 70) - mouse.y) < 80) a.getHit(mouse.px, mouse.py);
}, { passive: true });

function maybeStartFight() {
  if (fightCheck-- > 0) return;
  fightCheck = rand(500, 1100);
  const free = agents.filter(a => a.state === "walk" || a.state === "idle");
  if (free.length < 2) return;
  for (let i = 0; i < free.length; i++)
    for (let j = i + 1; j < free.length; j++)
      if (Math.hypot(free[i].x - free[j].x, free[i].y - free[j].y) < 300 && Math.random() < 0.6) {
        free[i].startFight(free[j]);
        free[j].opponent = free[i]; free[j].state = "fight"; free[j].stateTimer = free[i].stateTimer; free[j].attacker = false;
        return;
      }
}

function loop() {
  ctx.clearRect(0, 0, W, H);
  maybeStartFight();
  agents.forEach(a => a.update(W, H));
  [...agents].sort((a, b) => a.y - b.y).forEach(a => a.draw(ctx));
  requestAnimationFrame(loop);
}

window.addEventListener("resize", resize);
resize();
initAgents();
loop();
