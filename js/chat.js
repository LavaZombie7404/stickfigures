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

async function claudeReply(c, history) {
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
  if (!res.ok) throw new Error(res.status + " " + (await res.text()).slice(0, 120));
  const data = await res.json();
  const block = (data.content || []).find(b => b.type === "text");
  return block ? block.text.trim() : "(fără răspuns)";
}

// fallback scriptat simplu (fără cheie)
function scriptedReply(c, msg) {
  const t = msg.toLowerCase();
  if (/salut|buna|bună|hei|hello|noroc/.test(t)) return pick(["Salut! 🙂", "Hei! Ce faci?", "Bună!"]);
  if (/cine|nume|esti|ești/.test(t)) return `Sunt ${c.name}, din gașca lui Alan Becker!`;
  if (/ce faci|cum esti|cum ești/.test(t)) return pick(c.chatter);
  if (/pa|bye|la revedere/.test(t)) return "Pa! Revino oricând. 👋";
  return pick([...c.chatter, "Interesant! Mai zi.", "Zi mai departe 🙂", "Hmm, spune-mi mai mult."]);
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

  const typing = document.createElement("div");
  typing.className = "cmsg bot typing"; typing.textContent = "toți scriu…";
  gLog.appendChild(typing); gLog.scrollTop = gLog.scrollHeight;

  const replies = await Promise.all(CHARACTERS.map(async (c) => {
    if (!histories[c.id]) histories[c.id] = [];
    histories[c.id].push({ role: "user", content: msg });
    let r;
    try { r = hasKey() ? await claudeReply(c, histories[c.id]) : scriptedReply(c, msg); }
    catch (err) { r = "(eroare: " + (err.message || err) + ")"; }
    histories[c.id].push({ role: "assistant", content: r });
    if (histories[c.id].length > 20) histories[c.id] = histories[c.id].slice(-20);
    return { c, r };
  }));

  typing.remove();
  replies.forEach(({ c, r }) => {
    gAdd("bot", c.name, c.color, r);
    const ag = agents.find(a => a.c.id === c.id);
    if (ag) ag.speak(r.length > 22 ? r.slice(0, 20) + "…" : r, 120);
  });
});
