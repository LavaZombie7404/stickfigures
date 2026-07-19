// Desenează și animă un stick-figure pe un <canvas>, în stil Alan Becker.
// Stări: idle (respiră/se leagănă), talk (dă din brațe), wave (salută),
// hit (recul + stele + ochi X), ko (căzut).

class StickFigure {
  constructor(canvas, color) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.color = color;
    this.state = "idle";
    this.t = 0;             // timp animație
    this.hitTimer = 0;      // cadre rămase din reacția de lovit
    this.talkTimer = 0;
    this.waveTimer = 0;
    this.recoil = 0;        // deplasare pe X din lovitură
    this.ko = false;
    this.stars = [];
    this._running = false;
  }

  start() {
    if (this._running) return;
    this._running = true;
    const loop = () => {
      if (!this._running) return;
      this.update();
      this.draw();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  stop() { this._running = false; }

  hit() {
    if (this.ko) return;
    this.state = "hit";
    this.hitTimer = 45;
    this.recoil = -18;
    // câteva stele orbitale
    this.stars = [];
    for (let i = 0; i < 4; i++) {
      this.stars.push({ ang: (Math.PI * 2 * i) / 4, r: 22, speed: 0.18 + i * 0.02 });
    }
  }

  setKO(v) {
    this.ko = v;
    this.state = v ? "ko" : "idle";
    if (!v) { this.hitTimer = 0; this.recoil = 0; this.stars = []; }
  }

  talk() { if (this.ko) return; this.state = "talk"; this.talkTimer = 70; }
  wave() { if (this.ko) return; this.state = "wave"; this.waveTimer = 60; }

  update() {
    this.t += 0.06;
    if (this.hitTimer > 0) {
      this.hitTimer--;
      this.recoil *= 0.86;
      this.stars.forEach(s => { s.ang += s.speed; s.r *= 0.985; });
      if (this.hitTimer === 0 && !this.ko) { this.state = "idle"; this.stars = []; }
    }
    if (this.talkTimer > 0) { this.talkTimer--; if (this.talkTimer === 0 && this.state === "talk") this.state = "idle"; }
    if (this.waveTimer > 0) { this.waveTimer--; if (this.waveTimer === 0 && this.state === "wave") this.state = "idle"; }
  }

  draw() {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    ctx.clearRect(0, 0, W, H);

    const cx = W / 2 + (this.recoil || 0);
    const groundY = H - 14;
    const bob = this.ko ? 0 : Math.sin(this.t) * 3;
    const tilt = this.state === "hit" ? Math.sin(this.hitTimer * 0.5) * 0.18 : 0;

    ctx.save();
    ctx.translate(cx, 0);
    if (this.ko) { ctx.translate(0, 26); ctx.rotate(-Math.PI / 2.1); }
    else ctx.rotate(tilt);

    ctx.strokeStyle = this.color;
    ctx.fillStyle = this.color;
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const headR = 15;
    const headY = 34 + bob;
    const neckY = headY + headR;
    const hipY = groundY - 34;

    // corp
    ctx.beginPath();
    ctx.moveTo(0, neckY);
    ctx.lineTo(0, hipY);
    ctx.stroke();

    // cap
    ctx.beginPath();
    ctx.arc(0, headY, headR, 0, Math.PI * 2);
    ctx.stroke();

    // față
    ctx.save();
    ctx.fillStyle = this.color;
    if (this.state === "hit" || this.ko) {
      // ochi X_X
      ctx.lineWidth = 2.5;
      const drawX = (ex) => {
        ctx.beginPath();
        ctx.moveTo(ex - 3, headY - 4); ctx.lineTo(ex + 3, headY + 2);
        ctx.moveTo(ex + 3, headY - 4); ctx.lineTo(ex - 3, headY + 2);
        ctx.stroke();
      };
      drawX(-5); drawX(5);
    } else {
      // ochi puncte
      ctx.beginPath();
      ctx.arc(-5, headY - 2, 2, 0, Math.PI * 2);
      ctx.arc(5, headY - 2, 2, 0, Math.PI * 2);
      ctx.fill();
      // gura: deschisă când vorbește
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      if (this.state === "talk") {
        const mo = 2 + Math.abs(Math.sin(this.t * 3)) * 3;
        ctx.arc(0, headY + 5, mo, 0, Math.PI);
      } else {
        ctx.moveTo(-4, headY + 6); ctx.lineTo(4, headY + 6);
      }
      ctx.stroke();
    }
    ctx.restore();

    // brațe
    ctx.lineWidth = 5;
    const shoulderY = neckY + 6;
    let lArm, rArm;
    if (this.state === "wave") {
      lArm = { x: -18, y: hipY - 10 };
      rArm = { x: 16, y: headY - 6 + Math.sin(this.t * 6) * 6 }; // salută
    } else if (this.state === "talk") {
      const g = Math.sin(this.t * 4) * 8;
      lArm = { x: -18, y: shoulderY + 14 + g };
      rArm = { x: 18, y: shoulderY + 14 - g };
    } else if (this.state === "hit") {
      lArm = { x: -20, y: shoulderY - 6 };
      rArm = { x: 20, y: shoulderY - 6 };
    } else {
      const sw = Math.sin(this.t) * 4;
      lArm = { x: -16, y: shoulderY + 18 + sw };
      rArm = { x: 16, y: shoulderY + 18 - sw };
    }
    ctx.beginPath(); ctx.moveTo(0, shoulderY); ctx.lineTo(lArm.x, lArm.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, shoulderY); ctx.lineTo(rArm.x, rArm.y); ctx.stroke();

    // picioare
    const sw2 = Math.sin(this.t + 1) * 3;
    ctx.beginPath(); ctx.moveTo(0, hipY); ctx.lineTo(-12, groundY + sw2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, hipY); ctx.lineTo(12, groundY - sw2); ctx.stroke();

    // stele la lovitură
    if (this.stars.length) {
      ctx.fillStyle = "#ffd23f";
      ctx.strokeStyle = "#e0a800";
      ctx.lineWidth = 1;
      this.stars.forEach(s => {
        const sx = Math.cos(s.ang) * s.r;
        const sy = headY - 18 + Math.sin(s.ang) * s.r * 0.6;
        this._star(ctx, sx, sy, 4);
      });
    }

    ctx.restore();
  }

  _star(ctx, x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      const a2 = a + Math.PI / 5;
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      ctx.lineTo(x + Math.cos(a2) * r * 0.45, y + Math.sin(a2) * r * 0.45);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}
