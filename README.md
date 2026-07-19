# 🕺 Stick Gang — Gașca lui Alan Becker

Un mini-site (fan-project) cu gașca de stick-figures din **Animator vs. Animation**
(Alan Becker): **Orange** (Second Coming), **Red**, **Green**, **Blue**, **Yellow**.

- 💬 **Vorbește** cu fiecare — au personalități distincte, răspund în română.
- 👊 **Altoiește-i** (buton „Lovește") — reacționează, au bară de viață, iar la KO îi poți da **Revive**.
- 🧠 **AI hibrid**: fără cheie merg pe replici scriptate (instant, pentru oricine);
  cu cheia ta Claude, răspund cu AI real, fiecare cu personalitatea lui.

## Rulare locală
Deschide `index.html` în browser. Atât. (Modul scriptat merge complet offline.)

## Activează Claude (opțional)
1. Apasă **⚙️ Setări AI**.
2. Lipește o cheie API Anthropic (`sk-ant-...`).
3. Cheia rămâne **doar în browserul tău** (localStorage) — se trimite exclusiv către
   `api.anthropic.com`. Folosim headerul `anthropic-dangerous-direct-browser-access`.
4. Model implicit: `claude-haiku-4-5` (rapid & ieftin). Schimbă `MODEL` în `js/app.js`.

⚠️ Notă: într-un site static oricine îți vede cheia dacă o pui hardcodată — de-aia
o cere de la fiecare vizitator, nu o punem noi în cod.

## Publicare pe GitHub Pages
```bash
# în folderul proiectului (deja are git init)
git add -A
git commit -m "Stick Gang site"
gh repo create stickfigures --public --source=. --push   # sau creezi manual repo pe github.com
# apoi: Settings → Pages → Branch: main /(root) → Save
```
Site-ul va fi la `https://<user>.github.io/stickfigures/`.

## Structură
- `index.html` — pagina
- `css/style.css` — stil (temă întunecată)
- `js/characters.js` — personaje + motor de răspunsuri scriptate
- `js/figures.js` — desen & animație stick-figure pe canvas
- `js/app.js` — UI, chat, integrare Claude, mecanica de luptă

Personajele aparțin lui Alan Becker; acesta e un proiect de fani, necomercial.
