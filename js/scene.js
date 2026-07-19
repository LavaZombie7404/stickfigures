// Scenă: stick-figures cu membre articulate pe pământ. Merg, uneori ALEARGĂ, se bat cu
// pumni ȘI picioare, uneori CONSTRUIESC o casă, uneori se culcă (~5 min, pe spate/față).
// Click stânga = lovitură. Click dreapta = chat (window.openChat).

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

let groundY = 0;
let structures = []; // casele construite {x, color, progress}

class Agent {
  constructor(c, W) {
    this.c = c;
    this.x = rand(120, W - 120);
    this.face = Math.random() < 0.5 ? 1 : -1;
    this.speed = rand(0.55, 0.95);
    this.state = "walk";  // walk | run | idle | fight | hit | sleep | build
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
    this.builtCount = 0; // max 2 construcții per stickman
    this.jumping = false;
    this.jumpT = 0;
    this.jumpCd = 0;
    this.away = false;      // plecat în aventură
    this.awayTimer = 0;
    this.exitX = 0;
    this.adventure = false;
  }

  returnFromAdventure(W) {
    this.away = false; this.adventure = false;
    const side = Math.random() < 0.5 ? -1 : 1;
    this.x = side < 0 ? 60 : W - 60;
    this.face = side < 0 ? 1 : -1;
    this.state = "walk"; this.targetX = rand(220, W - 220);
    this.speak(this.c.id === "orange" ? "Ce aventură!" : "Ne-am întors!", 140);
  }

  speak(text, ttl = 120) { this.say = { text, ttl }; }

  getHit(fromX) {
    if (this.hitCooldown > 0) return;
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
    // plecat în aventură → invizibil, revine după timer
    if (this.away) { if (--this.awayTimer <= 0) this.returnFromAdventure(W); return; }

    this.bob += 0.06;
    if (this.hitCooldown > 0) this.hitCooldown--;
    if (this.attackAnim > 0) this.attackAnim--;
    if (this.recoil > 0.5) this.recoil *= 0.85; else this.recoil = 0;
    this.stars.forEach(s => { s.ang += 0.2; s.r *= 0.96; });
    if (this.state !== "sleep" && !this.chatting) this.sleepCd--;

    // salt peste alții (overlay peste mers/alergare)
    if (this.jumpCd > 0) this.jumpCd--;
    if (this.jumping) {
      this.jumpT += 1 / 28;
      this.x += this.face * (this.speed + 1.8);
      this.walkPhase += 0.22;
      if (this.jumpT >= 1) { this.jumping = false; this.jumpT = 0; this.jumpCd = 30; }
    }

    if (this.say) { if (--this.say.ttl <= 0) this.say = null; }
    if (--this.chatterTimer <= 0) {
      this.chatterTimer = rand(700, 1500);
      if (this.state === "walk" || this.state === "idle") this.speak(pick(this.c.chatter), 120);
    }

    if (this.chatting) { this.state = "idle"; this.face = 1; this.jumping = false; return; }

    if (this.state === "hit") {
      this.x += this.vx; this.vx *= 0.9;
      if (--this.stateTimer <= 0) { this.state = "walk"; this.stateTimer = rand(60, 160); this.targetX = null; }
    }
    else if (this.state === "leaving") {
      const dx = this.exitX - this.x;
      this.face = dx >= 0 ? 1 : -1;
      this.x += Math.sign(dx) * (this.speed + 1.3);
      this.walkPhase += 0.28;
      if (this.x < -50 || this.x > W + 50) { this.away = true; this.awayTimer = 7200; } // ~2 min
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
        else if (!this.jumping) { this.x += Math.sign(dx) * this.speed * 2.6; this.face = dx >= 0 ? 1 : -1; this.walkPhase += 0.34; }
      }
    }
    else if (this.state === "sleep") {
      if (this.sleepPhase === "down") {
        this.lie = Math.min(1, this.lie + 0.04);
        if (this.lie >= 1) { this.sleepPhase = "rest"; this.sleepTimer = 1200; }
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
      if (d > 66) { this.x += Math.sign(dx) * (this.speed + 0.5); this.walkPhase += 0.25; }
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
    else { // walk / idle — alege ce urmează
      if (this.targetX === null || this.stateTimer-- <= 0) {
        if (this.sleepCd <= 0) {
          this.state = "sleep"; this.sleepPhase = "down"; this.lie = 0;
          this.sleepDir = Math.random() < 0.5 ? 1 : -1; this.speak("...", 60); this.sleepCd = rand(14400, 21600);
        } else {
          const r = Math.random();
          if (r < 0.012 && this.builtCount < 2 && structures.length < 8) {
            const type = pick(["house", "tower", "tree", "campfire"]);
            this.state = "build"; this.buildDur = rand(340, 480); this.buildTimer = this.buildDur;
            const s = { x: this.x, color: this.c.color, progress: 0, type }; structures.push(s); this.building = s;
            this.builtCount++;
            const msg = { house: ["Construiesc!", "O casă!"], tower: ["Un turn!", "Sus!"], tree: ["Un copac!", "Verde!"], campfire: ["Un foc!", "Cald!"] };
            this.speak(pick(msg[type]), 120);
          } else if (r < 0.22) { this.state = "run"; this.targetX = rand(80, W - 80); this.stateTimer = rand(120, 260); this.speak(pick(["Aici!", "Repede!", "Hop!"]), 60); }
          else if (r < 0.45) { this.state = "idle"; this.targetX = null; this.stateTimer = rand(60, 140); }
          else { this.state = "walk"; this.targetX = rand(80, W - 80); this.stateTimer = rand(120, 300); }
        }
      }
      if (this.state === "walk" && this.targetX !== null && !this.jumping) {
        const dx = this.targetX - this.x;
        if (Math.abs(dx) < 4) this.targetX = null;
        else { this.x += Math.sign(dx) * this.speed; this.face = dx >= 0 ? 1 : -1; this.walkPhase += 0.18; }
      }
    }

    // dă de cineva chiar în față → DOAR UNUL sare peste (50/50 care)
    if ((this.state === "walk" || this.state === "run") && !this.jumping && this.jumpCd <= 0) {
      for (const o of agents) {
        if (o === this || o.away || o.jumping) continue;
        const dxo = o.x - this.x;
        if (Math.sign(dxo) === this.face && Math.abs(dxo) > 10 && Math.abs(dxo) < 46) {
          const headOn = (o.face === -this.face); // se întâlnesc față în față
          if (headOn && o.jumpCd <= 0 && Math.random() < 0.5) { o.jumping = true; o.jumpT = 0; }
          else { this.jumping = true; this.jumpT = 0; }
          this.jumpCd = 70; o.jumpCd = 70; // ambii intră în cooldown → nu sar amândoi
          break;
        }
      }
    }

    if (this.state !== "leaving") this.x = Math.max(60, Math.min(W - 60, this.x));
  }

  draw(ctx) {
    if (this.away) return; // plecat în aventură
    const c = this.c;
    const walking = (this.state === "walk" || this.state === "fight" || this.state === "run" || this.state === "leaving");
    const feetY = Math.round(groundY);
    const x = Math.round(this.x - (this.recoil || 0) * this.face);

    const jumpY = this.jumping ? Math.sin(this.jumpT * Math.PI) * 74 : 0; // arc peste ceilalți

    ctx.save();
    ctx.translate(x, feetY - jumpY);
    if (this.lie > 0) ctx.rotate(this.lie * (Math.PI / 2) * this.sleepDir);
    ctx.scale(this.face, 1);

    ctx.strokeStyle = c.color; ctx.fillStyle = c.color;
    ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.lineJoin = "round";

    const headR = c.headR;
    const hipY = -50;
    const breathe = Math.sin(this.bob) * 1.5;
    const leanX = this.state === "run" ? 7 : 0; // aplecare la alergat
    const shoulderY = hipY - 42 + breathe;
    const headCy = shoulderY - 8 - headR;
    const striking = this.state === "fight" && this.attackAnim > 0;

    // ---- picioare ----
    if (this.jumping) {
      for (const side of [-1, 1]) { // picioare strânse la salt
        const hipX = side * 3;
        ctx.beginPath();
        ctx.moveTo(hipX, hipY);
        ctx.lineTo(hipX + side * 12, hipY + 12);
        ctx.lineTo(hipX + side * 4, hipY - 4);
        ctx.stroke();
      }
    } else if (striking && this.attackType === "kick") {
      ctx.beginPath(); ctx.moveTo(-4, hipY); ctx.lineTo(-8, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(4, hipY); ctx.lineTo(26, hipY + 2); ctx.lineTo(50, hipY - 6); ctx.stroke();
    } else {
      const thigh = 25, shin = 25;
      for (const side of [-1, 1]) {
        const p = this.walkPhase + (side < 0 ? 0 : Math.PI);
        const swing = walking ? Math.sin(p) * (this.state === "run" ? 0.7 : 0.5) : 0;
        const lift = walking ? Math.max(0, Math.sin(p)) * (this.state === "run" ? 0.9 : 0.7) : 0;
        const hipX = side * 3;
        const kneeX = hipX + Math.sin(swing) * thigh;
        const kneeY = hipY + Math.cos(swing) * thigh;
        const shinA = swing - lift;
        ctx.beginPath();
        ctx.moveTo(hipX, hipY);
        ctx.lineTo(kneeX, kneeY);
        ctx.lineTo(kneeX + Math.sin(shinA) * shin, kneeY + Math.cos(shinA) * shin);
        ctx.stroke();
      }
    }

    // ---- corp ----
    ctx.beginPath(); ctx.moveTo(0, hipY); ctx.lineTo(leanX, shoulderY); ctx.stroke();

    // ---- brațe ----
    const upper = 20, fore = 18, sx = leanX, sy = shoulderY + 4;
    if (this.jumping) { // brațe ridicate la salt
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 16, sy - 12); ctx.lineTo(sx + 26, sy - 24); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - 16, sy - 12); ctx.lineTo(sx - 26, sy - 24); ctx.stroke();
    } else if (this.state === "build") {
      const hammer = Math.sin(this.bob * 5) * 8;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 14, sy - 12 + hammer); ctx.lineTo(sx + 24, sy - 24 + hammer); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - 12, sy - 10 - hammer); ctx.lineTo(sx - 20, sy - 20 - hammer); ctx.stroke();
    } else if (striking && this.attackType === "punch") {
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 22, sy - 2); ctx.lineTo(sx + 42, sy - 6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - 10, sy + 10); ctx.lineTo(sx - 4, sy - 6); ctx.stroke();
    } else if (this.state === "fight") {
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 12, sy + 8); ctx.lineTo(sx + 20, sy - 6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - 8, sy + 10); ctx.lineTo(sx - 2, sy - 2); ctx.stroke();
    } else {
      for (const side of [-1, 1]) {
        const p = this.walkPhase + (side < 0 ? Math.PI : 0);
        const swing = walking ? Math.sin(p) * (this.state === "run" ? 0.7 : 0.45) : Math.sin(this.bob + side) * 0.1;
        const elbowX = sx + Math.sin(swing) * upper;
        const elbowY = sy + Math.cos(swing) * upper;
        const foreA = swing + 0.35;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(elbowX, elbowY);
        ctx.lineTo(elbowX + Math.sin(foreA) * fore, elbowY + Math.cos(foreA) * fore);
        ctx.stroke();
      }
    }

    // ---- cap ----
    ctx.beginPath();
    ctx.arc(leanX, headCy, headR, 0, Math.PI * 2);
    if (c.hollowHead) ctx.stroke(); else ctx.fill();

    // ---- stele ----
    if (this.stars.length && this.recoil > 1) {
      ctx.fillStyle = "#ffd23f";
      this.stars.forEach(s => star(ctx, leanX + Math.cos(s.ang) * s.r, headCy - 8 + Math.sin(s.ang) * s.r * 0.6, 6));
    }

    ctx.restore();

    // ---- mesaj deasupra ----
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
let frame = 0;
let adventureCd = rand(1800, 4200); // prima aventură în ~30-70s

function resize() {
  const dpr = window.devicePixelRatio || 1;
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.width = W + "px"; canvas.style.height = H + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  groundY = Math.max(180, H - 90);
}

function initAgents() { agents = CHARACTERS.map(c => new Agent(c, W)); }

// Orange strigă "Aventură!" → câțiva vin, zic "Hai!" și pleacă toți; revin după ~2 min
function startAdventure() {
  const orange = agents.find(a => a.c.id === "orange");
  if (!orange || orange.away || orange.state === "sleep" || orange.state === "leaving" || orange.chatting) return;
  const others = agents.filter(a => a !== orange && !a.away && a.state !== "sleep" && a.state !== "leaving" && !a.chatting);
  if (others.length === 0) return;
  const side = Math.random() < 0.5 ? -1 : 1;
  const exitX = side < 0 ? -120 : W + 120;
  orange.speak("Aventură!", 160);
  if (orange.opponent) orange.endFight();
  let followers = others.filter(() => Math.random() < 0.55);
  if (followers.length === 0) followers = [pick(others)];
  followers.forEach(f => { if (f.opponent) f.endFight(); f.speak("Hai!", 130); });
  // pleacă cu mică întârziere ca să apuce să zică "Hai!"
  const group = [orange, ...followers];
  group.forEach((a, i) => setTimeoutLeave(a, exitX, 30 + i * 18));
}
const _pending = [];
function setTimeoutLeave(a, exitX, delay) { _pending.push({ a, exitX, t: delay }); }

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

window.addEventListener("click", (e) => { const a = nearestAgent(e.clientX, e.clientY); if (a) a.getHit(e.clientX); });
window.addEventListener("touchstart", (e) => { const t = e.touches[0]; if (t) { const a = nearestAgent(t.clientX, t.clientY); if (a) a.getHit(t.clientX); } }, { passive: true });
window.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  const a = nearestAgent(e.clientX, e.clientY);
  if (a && window.openChat) window.openChat(a);
});

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

function drawStructure(s) {
  const base = groundY, x = s.x, p = s.progress;
  ctx.save();
  ctx.strokeStyle = s.color; ctx.fillStyle = s.color;
  ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.globalAlpha = 0.9;

  if (s.type === "house") {
    const w = 120, wallH = 96, hh = wallH * Math.min(1, p / 0.7);
    ctx.strokeRect(x - w / 2, base - hh, w, hh);
    if (p > 0.7) {
      const rp = (p - 0.7) / 0.3;
      ctx.beginPath();
      ctx.moveTo(x - w / 2 - 8, base - wallH); ctx.lineTo(x, base - wallH - 46 * rp); ctx.lineTo(x + w / 2 + 8, base - wallH);
      ctx.stroke();
    }
    if (p >= 1) { ctx.strokeRect(x - 16, base - 44, 32, 44); ctx.strokeRect(x + 24, base - 74, 24, 24); }
  }
  else if (s.type === "tower") {
    const w = 56, wallH = 150, hh = wallH * Math.min(1, p / 0.85);
    ctx.strokeRect(x - w / 2, base - hh, w, hh);
    if (p >= 1) {
      for (let i = -1; i <= 1; i++) ctx.strokeRect(x + i * 18 - 7, base - wallH - 12, 14, 12); // creneluri
      ctx.strokeRect(x - 10, base - 42, 20, 42);   // ușă
      ctx.strokeRect(x - 9, base - 100, 18, 18);   // fereastră
    }
  }
  else if (s.type === "tree") {
    const trunkH = 64 * Math.min(1, p / 0.5);
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(x, base); ctx.lineTo(x, base - trunkH); ctx.stroke();
    if (p > 0.5) {
      const r = 46 * (p - 0.5) / 0.5;
      ctx.beginPath(); ctx.arc(x, base - 64 - 26, r, 0, Math.PI * 2); ctx.stroke();
    }
  }
  else if (s.type === "campfire") {
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(x - 24, base - 4); ctx.lineTo(x + 24, base - 16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 24, base - 16); ctx.lineTo(x + 24, base - 4); ctx.stroke();
    if (p > 0.35) {
      const rp = Math.min(1, (p - 0.35) / 0.65);
      const fl = (30 + Math.sin(frame * 0.3) * 7) * rp;
      ctx.fillStyle = "#ff9a2e";
      ctx.beginPath(); ctx.moveTo(x - 14, base - 12); ctx.quadraticCurveTo(x - 4, base - 12 - fl * 0.6, x, base - 12 - fl); ctx.quadraticCurveTo(x + 4, base - 12 - fl * 0.6, x + 14, base - 12); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#ffd23f";
      ctx.beginPath(); ctx.moveTo(x - 6, base - 12); ctx.quadraticCurveTo(x, base - 12 - fl * 0.75, x + 6, base - 12); ctx.closePath(); ctx.fill();
    }
  }
  ctx.restore();
}

function loop() {
  frame++;
  ctx.clearRect(0, 0, W, H);
  drawGround();
  structures.forEach(drawStructure);

  // aventură: declanșare rară + plecări întârziate ("Hai!")
  if (adventureCd-- <= 0) { adventureCd = rand(3600, 9000); startAdventure(); }
  for (let i = _pending.length - 1; i >= 0; i--) {
    const p = _pending[i];
    if (--p.t <= 0) {
      if (!p.a.away) { p.a.state = "leaving"; p.a.exitX = p.exitX; p.a.adventure = true; if (p.a.opponent) p.a.endFight(); }
      _pending.splice(i, 1);
    }
  }

  maybeStartFight();
  agents.forEach(a => a.update(W));
  [...agents].sort((a, b) => a.x - b.x).forEach(a => a.draw(ctx));
  requestAnimationFrame(loop);
}

window.addEventListener("resize", resize);
resize();
initAgents();
loop();
