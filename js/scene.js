// Scenă full-screen: stick-figures mari care merg pe PĂMÂNT (o linie de sol la bază),
// doar stânga-dreapta. Uneori se iau la bătaie. Mouse-ul spre un stickman îl lovește.

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

let groundY = 0; // nivelul solului (unde stau picioarele)

class Agent {
  constructor(c, W) {
    this.c = c;
    this.x = rand(120, W - 120);
    this.face = Math.random() < 0.5 ? 1 : -1;
    this.speed = rand(0.6, 1.0);
    this.state = "walk";       // walk | idle | fight | hit
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
    this.say = null;               // { text, ttl }
    this.chatterTimer = rand(120, 400);
  }

  speak(text, ttl = 120) { this.say = { text, ttl }; }

  getHit(fromX) {
    if (this.hitCooldown > 0) return;
    this.hitCooldown = 40;
    this.state = "hit";
    this.stateTimer = 40;
    const dir = this.x >= fromX ? 1 : -1;
    this.vx = dir * 10;
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

    // text deasupra capului
    if (this.say) { if (--this.say.ttl <= 0) this.say = null; }
    if (--this.chatterTimer <= 0) {
      this.chatterTimer = rand(300, 700);
      if (this.state === "walk" || this.state === "idle") this.speak(pick(this.c.chatter), 120);
    }
    // celălalt reacționează la pumn în bătaie
    if (this.state === "fight" && this.opponent && this.opponent.recoil > 10 && !this.opponent.say) {
      this.opponent.speak(pick(this.opponent.c.hitLines), 45);
    }

    if (this.state === "hit") {
      this.x += this.vx; this.vx *= 0.9;
      if (--this.stateTimer <= 0) { this.state = "walk"; this.stateTimer = rand(60, 160); this.targetX = null; }
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
        this.attacker = false; o.attacker = true; o.punchTimer = rand(20, 34);
      }
      if (--this.stateTimer <= 0) this.endFight();
    }
    else { // walk / idle
      if (this.targetX === null || this.stateTimer-- <= 0) {
        if (Math.random() < 0.25) { this.state = "idle"; this.targetX = null; this.stateTimer = rand(40, 120); }
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
    const bobY = Math.sin(this.bob) * 3;
    const x = Math.round(this.x - (this.recoil || 0) * this.face);
    const feetY = Math.round(groundY);
    const headR = c.headR;
    const hipY = feetY - 48;
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

    // cap: Orange gol (contur), ceilalți umplut
    ctx.beginPath();
    ctx.arc(x, headCy, headR, 0, Math.PI * 2);
    if (c.hollowHead) ctx.stroke(); else ctx.fill();

    // brațe
    const swing = Math.sin(this.walkPhase) * (walking ? 14 : 4);
    if (this.state === "fight" && this.attacker) {
      ctx.beginPath(); ctx.moveTo(x, shoulderY + 6 + bobY); ctx.lineTo(x + 34 * this.face, shoulderY + 2 + bobY); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, shoulderY + 6 + bobY); ctx.lineTo(x - 18 * this.face, shoulderY + 26 + bobY); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(x, shoulderY + 6 + bobY); ctx.lineTo(x - 18, shoulderY + 28 + bobY + swing); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, shoulderY + 6 + bobY); ctx.lineTo(x + 18, shoulderY + 28 + bobY - swing); ctx.stroke();
    }

    // picioare (rămân pe sol)
    const legSwing = Math.sin(this.walkPhase) * (walking ? 16 : 3);
    ctx.beginPath(); ctx.moveTo(x, hipY); ctx.lineTo(x - 16 + legSwing, feetY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, hipY); ctx.lineTo(x + 16 - legSwing, feetY); ctx.stroke();

    // stele la lovitură
    if (this.stars.length && this.recoil > 1) {
      ctx.fillStyle = "#ffd23f";
      this.stars.forEach(s => {
        star(ctx, x + Math.cos(s.ang) * s.r, headCy - 8 + Math.sin(s.ang) * s.r * 0.6, 6);
      });
    }

    // mesaj deasupra capului
    if (this.say) {
      ctx.globalAlpha = Math.min(1, this.say.ttl / 35);
      ctx.fillStyle = c.color;
      ctx.font = "700 17px 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.shadowColor = c.color; ctx.shadowBlur = 10;
      ctx.fillText(this.say.text, x, headCy - headR - 12);
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
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
let fightCheck = 300;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.width = W + "px"; canvas.style.height = H + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  groundY = Math.max(180, H - 90); // podea aproape de baza ecranului
}

function initAgents() { agents = CHARACTERS.map(c => new Agent(c, W)); }

// CLICK stânga pe un stickman = lovitură (nu proximitate). Lovește doar cel mai apropiat.
function hitAt(cx, cy) {
  let best = null, bestD = 1e9;
  for (const a of agents) {
    const torsoY = groundY - 70;
    const headY = groundY - 90 - a.c.headR;
    const d = Math.min(Math.hypot(a.x - cx, torsoY - cy), Math.hypot(a.x - cx, headY - cy));
    if (d < bestD) { bestD = d; best = a; }
  }
  if (best && bestD < 75) best.getHit(cx);
}
window.addEventListener("click", (e) => hitAt(e.clientX, e.clientY));
window.addEventListener("touchstart", (e) => {
  const t = e.touches[0]; if (t) hitAt(t.clientX, t.clientY);
}, { passive: true });

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
