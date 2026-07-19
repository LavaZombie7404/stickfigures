// Chat pe right-click: fereastră de conversație cu un stickman. AI real prin Claude
// (cheia ta, în localStorage) sau fallback scriptat. Stil chatbot (ca ChatGPT).

const MODEL = "claude-haiku-4-5"; // rapid & ieftin; schimbă dacă vrei alt model
const LS_KEY = "stickfigures_anthropic_key";
const histories = {}; // per character id
let current = null;    // agentul cu care vorbești

const apiKey = () => (localStorage.getItem(LS_KEY) || "").trim();
const hasKey = () => apiKey().length > 10;

// ---- construiește fereastra de chat o singură dată ----
const panel = document.createElement("div");
panel.id = "chatPanel";
panel.className = "chat-panel hidden";
panel.innerHTML = `
  <div class="chat-head">
    <span class="dot"></span>
    <span class="cname"></span>
    <button class="chat-gear" title="Cheie AI">⚙</button>
    <button class="chat-close" title="Închide">✕</button>
  </div>
  <div class="chat-banner hidden"></div>
  <div class="chat-log"></div>
  <form class="chat-form"><input type="text" placeholder="Scrie un mesaj..." autocomplete="off"/><button type="submit">➤</button></form>
`;
document.body.appendChild(panel);

const elDot = panel.querySelector(".dot");
const elName = panel.querySelector(".cname");
const elLog = panel.querySelector(".chat-log");
const elForm = panel.querySelector(".chat-form");
const elInput = elForm.querySelector("input");
const elBanner = panel.querySelector(".chat-banner");

function refreshBanner() { elBanner.classList.add("hidden"); }

function addMsg(who, text) {
  const el = document.createElement("div");
  el.className = "cmsg " + who;
  el.textContent = text;
  elLog.appendChild(el);
  elLog.scrollTop = elLog.scrollHeight;
  return el;
}

window.openChat = function (agent) {
  if (current && current !== agent) current.chatting = false;
  current = agent;
  agent.chatting = true;
  if (agent.opponent) agent.endFight();

  const c = agent.c;
  elDot.style.background = c.color;
  elName.textContent = c.name;
  elName.style.color = c.color;
  panel.style.setProperty("--accent", c.color);
  panel.classList.remove("hidden");
  refreshBanner();

  // restaurează istoricul acestui personaj
  elLog.innerHTML = "";
  if (!histories[c.id]) histories[c.id] = [];
  if (histories[c.id].length === 0) {
    const hi = pick(["Salut! Ce faci?", "Hei! Cu ce te ajut?", "Oh, salut! Zi.", "Bună! Ce mai e nou?"]);
    histories[c.id].push({ role: "assistant", content: hi });
  }
  histories[c.id].forEach(m => addMsg(m.role === "user" ? "user" : "bot", m.content));
  setTimeout(() => elInput.focus(), 50);
};

function closeChat() {
  if (current) current.chatting = false;
  current = null;
  panel.classList.add("hidden");
}
panel.querySelector(".chat-close").addEventListener("click", closeChat);

// ⚙ cheie AI (folosit de ambele chat-uri)
function setKeyPrompt() {
  const v = prompt("Lipește cheia ta Claude (sk-ant-...) pentru AI real.\nRămâne doar în browserul tău. Lasă gol ca să o ștergi.", apiKey());
  if (v === null) return;
  if (v.trim()) localStorage.setItem(LS_KEY, v.trim()); else localStorage.removeItem(LS_KEY);
  refreshBanner();
  if (typeof refreshGBanner === "function") refreshGBanner();
}
panel.querySelector(".chat-gear").addEventListener("click", setKeyPrompt);

// trimite mesaj
elForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = elInput.value.trim();
  if (!msg || !current) return;
  elInput.value = "";
  const c = current.c;
  addMsg("user", msg);
  histories[c.id].push({ role: "user", content: msg });

  // comandă specială: cheamă gașca înapoi din excursie
  if (/^veniti|^veniți|întoarce|veniți acasă/i.test(msg) && window.recallAdventurers) {
    const n = window.recallAdventurers();
    addMsg("bot", n > 0 ? "Venim! 🏃" : "Suntem deja aici. 🙂");
  }

  const typing = addMsg("bot typing", "…");
  current.speak("...", 60);

  let reply;
  try {
    reply = hasKey() ? await claudeReply(c, histories[c.id]) : scriptedReply(c, msg);
  } catch (err) {
    reply = "(eroare AI: " + (err.message || err) + ")";
  }
  typing.remove();
  addMsg("bot", reply);
  histories[c.id].push({ role: "assistant", content: reply });
  if (histories[c.id].length > 20) histories[c.id] = histories[c.id].slice(-20);
  if (current) current.speak(reply.length > 24 ? reply.slice(0, 22) + "…" : reply, 120);
});

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function claudeReply(c, history, retry = 1) {
  const system =
    `Ești ${c.name}, un stick-figure din gașca lui Alan Becker (Animator vs. Animation). ` +
    `Personalitatea ta: ${c.persona} ` +
    `Vorbește în română, natural și prietenos, ca un chatbot inteligent și util (poți răspunde la orice, ca ChatGPT), ` +
    `dar păstrează-ți mereu personalitatea de ${c.name}. Răspunsuri scurte spre medii, conversaționale. Emoji ocazional, nu exagera.`;
  const messages = history.map(h => ({ role: h.role, content: h.content }));

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey(),
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 400, system, messages }),
  });
  if ((res.status === 429 || res.status === 529) && retry > 0) { await sleep(1400); return claudeReply(c, history, retry - 1); }
  if (!res.ok) throw new Error(res.status + " " + (await res.text()).slice(0, 120));
  const data = await res.json();
  const block = (data.content || []).find(b => b.type === "text");
  return block ? block.text.trim() : "(fără răspuns)";
}

// ---- fallback scriptat contextual (fără cheie) — nu răspunsuri random ----
let userName = null;
function tone(c, base) {
  const pre = { red: ["", "Hmph. "], green: ["", "Pace. "], blue: ["", "Logic: "], yellow: ["", "Yo! "], purple: ["", "Mwaha. "], orange: ["", ""] }[c.id] || [""];
  return pick(pre) + base;
}
function scriptedReply(c, msg) {
  const t = msg.toLowerCase().trim();
  let m = t.match(/(?:m[aă] cheam[aă]|numele meu (?:e|este)|eu sunt)\s+([a-zăâîșț]+)/i);
  if (m) { userName = m[1][0].toUpperCase() + m[1].slice(1); return tone(c, `Îmi pare bine, ${userName}! 🙂`); }
  if (/cum m[aă] cheam[aă]|care (?:e|ii|îi) numele meu/.test(t)) return tone(c, userName ? `Te cheamă ${userName}!` : "Nu mi-ai spus încă cum te cheamă.");
  if (/salut|bun[aă]|hei|hello|noroc|servus/.test(t)) return tone(c, pick(["Salut!", "Hei, ce faci?", "Bună!"]));
  if (/ce faci|cum e(ș|s)ti|ce mai faci/.test(t)) return tone(c, pick(c.chatter));
  if (/cine e(ș|s)ti|ce e(ș|s)ti/.test(t)) return tone(c, `Sunt ${c.name}, din gașca lui Alan Becker!`);
  if (/mul(ț|t)umesc|mersi|thx|thanks/.test(t)) return tone(c, "Cu plăcere! 🙂");
  if (/(^|\s)(pa|bye|la revedere|ne vedem)(\s|$)/.test(t)) return tone(c, "Pa! Revino oricând. 👋");
  if (/minecraft|redstone|bloc|construi/.test(t)) return tone(c, "Minecraft! Am construit atâtea acolo. ⛏️");
  if (/lupt[aă]|b[aă]taie|fight/.test(t)) return tone(c, "O luptă? Depinde cu cine. 💪");
  if (/glum[aă]|banc|haios|r[aâ]zi/.test(t)) return tone(c, "Haha! Îmi place umorul. 😄");
  if (/iubes|dragoste|frumos|dr[aă]gu/.test(t)) return tone(c, "Aww, ești de treabă. 🧡");
  if (/aventur[aă]|explor|expedi/.test(t)) return tone(c, "Aventură? Mă bag oricând! 🗺️");
  if (/ajut|help|cum (s[aă]|pot)/.test(t)) return tone(c, "Sigur, spune-mi ce-ți trebuie.");
  if (t.endsWith("?")) return tone(c, pick(["Bună întrebare! Tu cum vezi?", "Hmm, interesant. Spune-mi mai multe.", "Depinde — dă-mi detalii."]));
  if (t.length > 3) return tone(c, pick(["Serios? Spune-mi mai mult.", "Interesant! Și apoi?", "Aha, te ascult.", "De ce zici asta?"]));
  return tone(c, pick(c.chatter));
}

// ================= CHAT DE GRUP (vorbește cu toți) =================
const gbtn = document.createElement("button");
gbtn.id = "groupBtn";
gbtn.textContent = "💬 Vorbește cu toți";
document.body.appendChild(gbtn);

const gpanel = document.createElement("div");
gpanel.className = "chat-panel group hidden";
gpanel.innerHTML = `
  <div class="chat-head">
    <span class="cname" style="color:#cdd3ff">Toată gașca</span>
    <button class="chat-gear" title="Cheie AI">⚙</button>
    <button class="chat-close" title="Închide">✕</button>
  </div>
  <div class="chat-banner hidden"></div>
  <div class="chat-log"></div>
  <form class="chat-form"><input type="text" placeholder="Scrie tuturor..." autocomplete="off"/><button type="submit">➤</button></form>
`;
document.body.appendChild(gpanel);

const gLog = gpanel.querySelector(".chat-log");
const gForm = gpanel.querySelector(".chat-form");
const gInput = gForm.querySelector("input");
const gBanner = gpanel.querySelector(".chat-banner");

function refreshGBanner() { gBanner.classList.add("hidden"); }

function gAdd(who, name, color, text) {
  const el = document.createElement("div");
  el.className = "cmsg " + who;
  if (name) {
    const s = document.createElement("span");
    s.className = "who"; s.textContent = name + ": "; s.style.color = color;
    el.appendChild(s); el.appendChild(document.createTextNode(text));
  } else el.textContent = text;
  gLog.appendChild(el);
  gLog.scrollTop = gLog.scrollHeight;
}

gbtn.addEventListener("click", () => {
  gpanel.classList.toggle("hidden");
  if (!gpanel.classList.contains("hidden")) {
    refreshGBanner();
    if (gLog.childElementCount === 0) gAdd("bot", null, null, "Scrie un mesaj și îți răspund toți cinci 🙂");
    setTimeout(() => gInput.focus(), 50);
  }
});
gpanel.querySelector(".chat-close").addEventListener("click", () => gpanel.classList.add("hidden"));
gpanel.querySelector(".chat-gear").addEventListener("click", setKeyPrompt);

gForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = gInput.value.trim();
  if (!msg) return;
  gInput.value = "";
  gAdd("user", null, null, msg);

  if (/^veniti|^veniți|întoarce|veniți acasă/i.test(msg) && window.recallAdventurers) {
    const n = window.recallAdventurers();
    gAdd("bot", null, null, n > 0 ? "🏃 Se întorc toți din excursie!" : "Sunt deja toți aici. 🙂");
  }

  // secvențial → toți răspund (evită rate-limit-ul care făcea să meargă doar la unii)
  for (const c of CHARACTERS) {
    if (!histories[c.id]) histories[c.id] = [];
    histories[c.id].push({ role: "user", content: msg });
    let r;
    try { r = hasKey() ? await claudeReply(c, histories[c.id]) : scriptedReply(c, msg); }
    catch (err) { r = scriptedReply(c, msg); }
    histories[c.id].push({ role: "assistant", content: r });
    if (histories[c.id].length > 20) histories[c.id] = histories[c.id].slice(-20);
    gAdd("bot", c.name, c.color, r);
    const ag = agents.find(a => a.c.id === c.id);
    if (ag) ag.speak(r.length > 22 ? r.slice(0, 20) + "…" : r, 120);
  }
});

// ================= BUTON EXPEDIȚIA =================
const ebtn = document.createElement("button");
ebtn.id = "expedBtn"; ebtn.textContent = "🗺️ Expediția";
document.body.appendChild(ebtn);

const epanel = document.createElement("div");
epanel.className = "exped-panel hidden";
epanel.innerHTML = `<div class="chat-head"><span class="cname" style="color:#ffd27a">🗺️ Expediția</span><button class="chat-close">✕</button></div><div class="exped-body"></div>`;
document.body.appendChild(epanel);
const eBody = epanel.querySelector(".exped-body");
epanel.querySelector(".chat-close").addEventListener("click", () => { epanel.classList.add("hidden"); });

let expedTick = null;
function refreshExped() {
  const info = window.getExpedition ? window.getExpedition() : { active: false };
  if (!info.active) { eBody.innerHTML = `<p class="exped-empty">Nimeni nu e plecat în expediție acum.</p><p class="exped-hint">Când Orange strigă „Aventură!", câțiva pleacă aici. Scrie <b>veniti</b> în chat ca să-i chemi.</p>`; return; }
  const t = info.remaining === null ? "pornesc chiar acum…" : `se întorc în ~${Math.floor(info.remaining / 60)}:${String(info.remaining % 60).padStart(2, "0")}`;
  eBody.innerHTML = `<p class="exped-line">🧭 <b>${info.names.join(", ")}</b></p><p class="exped-line">📍 au plecat spre <b>${info.place}</b></p><p class="exped-line">⚔️ ca să <b>${info.activity}</b></p><p class="exped-line">⏳ ${t}</p>`;
}
ebtn.addEventListener("click", () => {
  epanel.classList.toggle("hidden");
  if (!epanel.classList.contains("hidden")) { refreshExped(); expedTick = setInterval(refreshExped, 1000); }
  else if (expedTick) { clearInterval(expedTick); expedTick = null; }
});
