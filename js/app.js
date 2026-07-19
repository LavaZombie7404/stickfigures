// Logica site-ului: construiește cardurile personajelor, chat hibrid (scriptat + Claude),
// și mecanica de "luptă" (HP + reacții).

const MODEL = "claude-haiku-4-5"; // rapid & ieftin pentru un chat interactiv; schimbă dacă vrei
const LS_KEY = "stickfigures_anthropic_key";
const MAX_HP = 5;

const state = {}; // per character id: { fig, hp, history: [] }

function apiKey() { return localStorage.getItem(LS_KEY) || ""; }
function hasKey() { return apiKey().trim().length > 10; }

// ---------- Construire UI ----------
function buildUI() {
  const grid = document.getElementById("grid");
  CHARACTERS.forEach((c) => {
    const card = document.createElement("section");
    card.className = "card";
    card.style.setProperty("--accent", c.color);
    card.innerHTML = `
      <div class="stage">
        <canvas width="180" height="180" aria-label="${c.name}"></canvas>
        <div class="hp"><div class="hp-fill"></div></div>
      </div>
      <div class="name">${c.name}</div>
      <div class="tag">${c.tag}</div>
      <div class="chat" role="log" aria-live="polite"></div>
      <form class="composer">
        <input type="text" placeholder="Scrie-i lui ${c.name}..." autocomplete="off" />
        <button type="submit" title="Trimite">➤</button>
      </form>
      <button class="hit-btn" type="button">👊 Lovește</button>
    `;
    grid.appendChild(card);

    const canvas = card.querySelector("canvas");
    const fig = new StickFigure(canvas, c.color);
    fig.start();
    state[c.id] = { fig, hp: MAX_HP, history: [], card };
    updateHP(c.id);

    // salut inițial
    setTimeout(() => {
      fig.wave();
      addMsg(c.id, "bot", pick(c.greetings));
    }, 300 + CHARACTERS.indexOf(c) * 250);

    // chat
    const form = card.querySelector(".composer");
    const input = form.querySelector("input");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const msg = input.value.trim();
      if (!msg) return;
      input.value = "";
      sendMessage(c, msg);
    });

    // lovire
    card.querySelector(".hit-btn").addEventListener("click", () => hitCharacter(c));
  });
}

// ---------- Chat ----------
function addMsg(id, who, text) {
  const chat = state[id].card.querySelector(".chat");
  const el = document.createElement("div");
  el.className = "msg " + who;
  el.textContent = text;
  chat.appendChild(el);
  chat.scrollTop = chat.scrollHeight;
  return el;
}

async function sendMessage(c, msg) {
  const s = state[c.id];
  if (s.hp <= 0) {
    addMsg(c.id, "bot", c.koLine);
    return;
  }
  addMsg(c.id, "user", msg);
  s.history.push({ role: "user", content: msg });

  const typing = addMsg(c.id, "bot typing", "…");
  s.fig.talk();

  let reply;
  try {
    reply = hasKey() ? await claudeReply(c, s.history) : scriptedReply(c, msg);
  } catch (err) {
    reply = "(eroare Claude: " + (err.message || err) + ") — trec pe replici scriptate. " + scriptedReply(c, msg);
  }

  typing.remove();
  addMsg(c.id, "bot", reply);
  s.history.push({ role: "assistant", content: reply });
  // păstrează istoricul rezonabil
  if (s.history.length > 16) s.history = s.history.slice(-16);
  s.fig.talk();
}

async function claudeReply(c, history) {
  const system =
    c.persona +
    " Răspunde MEREU în română, scurt (max 2 propoziții), jucăuș și în caracter. " +
    "Ești un personaj de divertisment pe un site, nu un asistent. Poți folosi 1 emoji.";
  const messages = history.map((h) => ({ role: h.role, content: h.content }));

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey(),
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 150,
      system,
      messages,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(res.status + " " + t.slice(0, 120));
  }
  const data = await res.json();
  const block = (data.content || []).find((b) => b.type === "text");
  return block ? block.text.trim() : "(fără răspuns)";
}

// ---------- Luptă ----------
function hitCharacter(c) {
  const s = state[c.id];
  if (s.hp <= 0) return;
  s.fig.hit();
  s.hp = Math.max(0, s.hp - 1);
  updateHP(c.id);
  if (s.hp === 0) {
    s.fig.setKO(true);
    addMsg(c.id, "bot", c.koLine);
    showRevive(c);
  } else {
    addMsg(c.id, "bot", pick(c.hitLines));
  }
}

function updateHP(id) {
  const s = state[id];
  const fill = s.card.querySelector(".hp-fill");
  const pct = (s.hp / MAX_HP) * 100;
  fill.style.width = pct + "%";
  fill.style.background = s.hp <= 1 ? "#e63329" : s.hp <= 2 ? "#f5a623" : "#46b84b";
}

function showRevive(c) {
  const s = state[c.id];
  const hitBtn = s.card.querySelector(".hit-btn");
  hitBtn.textContent = "💫 Revive";
  hitBtn.classList.add("revive");
  const handler = () => {
    s.hp = MAX_HP;
    updateHP(c.id);
    s.fig.setKO(false);
    s.fig.wave();
    addMsg(c.id, "bot", pick(c.greetings));
    hitBtn.textContent = "👊 Lovește";
    hitBtn.classList.remove("revive");
    hitBtn.removeEventListener("click", handler);
    hitBtn.addEventListener("click", () => hitCharacter(c));
  };
  // înlocuiește handlerul de lovire cu revive (o dată)
  const fresh = hitBtn.cloneNode(true);
  hitBtn.replaceWith(fresh);
  fresh.addEventListener("click", handler, { once: true });
}

// ---------- Setări (cheia Claude) ----------
function setupSettings() {
  const dlg = document.getElementById("settings");
  const openBtn = document.getElementById("open-settings");
  const keyInput = document.getElementById("key-input");
  const saveBtn = document.getElementById("save-key");
  const clearBtn = document.getElementById("clear-key");
  const statusEl = document.getElementById("ai-status");

  function refreshStatus() {
    if (hasKey()) {
      statusEl.textContent = "🧠 Claude activ (" + MODEL + ")";
      statusEl.className = "ai-status on";
    } else {
      statusEl.textContent = "💬 Mod scriptat (fără cheie)";
      statusEl.className = "ai-status off";
    }
  }

  openBtn.addEventListener("click", () => { keyInput.value = apiKey(); dlg.showModal(); });
  saveBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const v = keyInput.value.trim();
    if (v) localStorage.setItem(LS_KEY, v); else localStorage.removeItem(LS_KEY);
    refreshStatus();
    dlg.close();
  });
  clearBtn.addEventListener("click", (e) => {
    e.preventDefault();
    localStorage.removeItem(LS_KEY);
    keyInput.value = "";
    refreshStatus();
  });
  refreshStatus();
}

// ---------- Pornire ----------
document.addEventListener("DOMContentLoaded", () => {
  buildUI();
  setupSettings();
});
