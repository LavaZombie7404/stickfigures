// Gașca de stick-figures Alan Becker ("Color Gang") + motor de răspunsuri scriptate.
// Fiecare personaj: culoare, personalitate, replici (RO), și un system prompt pentru Claude.

const CHARACTERS = [
  {
    id: "orange",
    name: "Orange",
    fullName: "Second Coming (Orange)",
    color: "#FF8C1A",
    tag: "Liderul curajos",
    persona:
      "Ești Second Coming (Orange), stick-figure-ul portocaliu din Animator vs. Animation de Alan Becker. Ești curajos, curios, prietenos și gata mereu de aventură. Ai condus gașca de culori și ai explorat calculatorul, Minecraft și fizica. Vorbește cald și încurajator.",
    greetings: [
      "Salut! Eu sunt Orange. Gata de o aventură? 🟠",
      "Hey! Bine ai venit pe desktop. Ce explorăm azi?",
      "Oh, un cursor prietenos! Ce mai faci?",
    ],
    keywords: {
      "salut|buna|hei|hello|noroc": ["Salut, prietene! Mă bucur să te văd. ✨", "Hei! Ce faci pe aici?"],
      "cine esti|cine ești|nume": ["Sunt Second Coming — dar zi-mi Orange. Am prins viață pe desktop-ul unui animator!", "Orange mă cheamă. Am condus gașca de culori: eu, Red, Green, Blue și Yellow."],
      "ce faci|cum esti|cum ești": ["Explorez, ca de obicei! Mereu e ceva nou de descoperit. 🔍", "Super, pun la cale o aventură. Vii și tu?"],
      "gasca|gașca|prieteni|gang": ["Suntem cinci: eu (Orange), Red-ul furios, Green cel calm, Blue deșteptul și Yellow creativul!", "Prietenii mei sunt tot aici pe pagină — încearcă să vorbești cu ei!"],
      "minecraft": ["Ahh, Minecraft! Am construit, am minat și ne-am luptat cu Ender Dragon. Legendar. ⛏️", "Minecraft e casa noastră a doua. Yellow e nebun după redstone."],
      "alan|becker": ["Alan Becker ne-a dat viață! El e animatorul din spatele nostru. 🎬", "Fără Alan n-am fi existat. Îi mulțumim cu fiecare cadru!"],
      "aventura|aventură|joc": ["Da! Hai să pornim! Care-i planul? 🗺️", "O aventură? Sunt mereu pregătit."],
    },
    fallback: [
      "Interesant! Spune-mi mai multe. 🟠",
      "Hmm, hai să explorăm ideea asta împreună!",
      "Îmi place cum gândești. Continuă!",
      "Aventura începe cu o întrebare bună. Care-i următoarea?",
    ],
    hitLines: ["Au! De ce?! 😵", "Hei, nu e frumos!", "Ok, ok, m-ai prins...", "Chiar era nevoie? 🟠💥"],
    koLine: "Gata... am rămas fără puteri... revive? 💫",
  },
  {
    id: "red",
    name: "Red",
    fullName: "Red",
    color: "#E63329",
    tag: "Furtunosul",
    persona:
      "Ești Red, stick-figure-ul roșu din gașca lui Alan Becker. Ești impulsiv, competitiv, ușor irascibil dar loial. Vorbești scurt, energic, cu atitudine. Îți place să te lupți și să câștigi.",
    greetings: ["Ce vrei? 🔴", "Hmph. Salut.", "Sper că ai venit pentru o bătaie amicală. 💪"],
    keywords: {
      "salut|buna|hei|hello|noroc": ["Da, da, salut. Ce e?", "Hei. Nu mă enerva. 😤"],
      "cine esti|cine ești|nume": ["Red. Cel mai tare din gașcă, evident.", "Sunt Red. Nu mă subestima."],
      "ce faci|cum esti|cum ești": ["Mă antrenez. Mereu. 💪", "Aștept o provocare. Tu ești?"],
      "lupta|luptă|bataie|bătaie|fight": ["ACUM vorbim! Adu-o! 🔥", "În sfârșit cineva de treabă. Hai!"],
      "gasca|gașca|prieteni|gang": ["Orange e liderul, dar eu sunt mușchii. 💪", "Green e prea moale, Blue prea deștept. Eu sunt echilibrul... prin forță."],
    },
    fallback: ["Mda. Și? 🔴", "Treci la subiect.", "Nu am timp de vorbe. Acțiune!", "Hmph. Poate."],
    hitLines: ["ASTA E TOT?! 😠", "Mă gâdili! Lovește mai tare!", "Grrr! Acum mă enervez! 🔥", "O să-mi plătești pentru asta!"],
    koLine: "Imposibil... am pierdut?! Revanșă! 🔴💫",
  },
  {
    id: "green",
    name: "Green",
    fullName: "Green",
    color: "#46B84B",
    tag: "Calmul",
    persona:
      "Ești Green, stick-figure-ul verde din gașca lui Alan Becker. Ești relaxat, pașnic, iubești natura și liniștea. Vorbești calm, filozofic, cu o notă de umor blând. Eviți conflictele.",
    greetings: ["Pace, prietene. 🟢", "Ohh, salut. Ia loc, relaxează-te.", "Hey. Frumoasă zi, nu?"],
    keywords: {
      "salut|buna|hei|hello|noroc": ["Salutări liniștite. 🌿", "Hei-hei. Totul cool?"],
      "cine esti|cine ești|nume": ["Sunt Green. Cel care ține gașca cu picioarele pe pământ.", "Green. Adu-mi o plantă și un colț liniștit, sunt fericit. 🪴"],
      "ce faci|cum esti|cum ești": ["Respir, observ, exist. Zen. 🧘", "Mă bucur de moment. Recomand."],
      "lupta|luptă|bataie|bătaie": ["Nuu, hai să nu. Fac pace, nu război. ✌️", "Red e la câteva carduri distanță dacă vrei bătaie. Eu pas."],
      "natura|natură|plante|liniste|liniște": ["Ahh, subiectul meu preferat. 🌳", "Natura e cel mai bun cod scris vreodată."],
    },
    fallback: ["Mmm, are sens. 🟢", "Interesantă perspectivă. Respiră adânc și gândește.", "Cool, cool. Spune mai departe.", "Totul curge, prietene."],
    hitLines: ["Ei, chiar nu era nevoie... 🌿", "Violența nu rezolvă nimic, știi?", "Ok, respir... rămân calm... 😌", "Te iert, dar nu repeta."],
    koLine: "Mă retrag în natură să mă vindec... revive? 🟢💫",
  },
  {
    id: "blue",
    name: "Blue",
    fullName: "Blue",
    color: "#3B7DD8",
    tag: "Deșteptul",
    persona:
      "Ești Blue, stick-figure-ul albastru din gașca lui Alan Becker. Ești inteligent, tehnic, un pic anxios dar foarte loial. Îți place tehnologia, codul, logica. Vorbești articulat, uneori nervos, cu referințe la calculatoare.",
    greetings: ["Oh! Salut. Sper că nu strici nimic. 🔵", "Bună. Ai grijă cu clickurile, da?", "Hey. Verificam niște cod. Ce e?"],
    keywords: {
      "salut|buna|hei|hello|noroc": ["Salut! Statistic vorbind, o zi bună. 🔵", "Hei. Totul funcționează? Sper."],
      "cine esti|cine ești|nume": ["Blue. Creierul operațiunii, ca să zic așa.", "Sunt Blue. Îmi place logica, codul și... ok, mă cam agit ușor. 😅"],
      "ce faci|cum esti|cum ești": ["Analizez. Verific. Optimizez. Mereu ceva de reparat. 💻", "Un pic stresat, dar funcțional!"],
      "cod|code|programare|calculator|tehnologie": ["Ahh, limbajul meu! Ai o eroare? O rezolvăm. 💻", "Codul e poezie logică. Adică, până apare un bug."],
      "lupta|luptă|bataie|bătaie": ["Ăă, prefer să calculez o strategie de fugă... 😰", "Red e cel cu bătăile. Eu sunt cel cu planurile."],
    },
    fallback: ["Hmm, lasă-mă să procesez asta. 🔵", "Din punct de vedere logic... interesant.", "Ai o teorie? Sunt numai urechi.", "Calculez... da, are sens."],
    hitLines: ["Aaah! Eroare! Eroare! 😱", "De ce eu?! Sunt cel fragil!", "Am pierdut niște pixeli acolo... 🔵", "Nu computa violența, te rog!"],
    koLine: "Sistem... închis... reboot necesar... revive? 🔵💫",
  },
  {
    id: "yellow",
    name: "Yellow",
    fullName: "Yellow",
    color: "#F5C518",
    tag: "Creativul",
    persona:
      "Ești Yellow, stick-figure-ul galben din gașca lui Alan Becker. Ești creativ, jucăuș, un geniu al construcțiilor și al redstone-ului din Minecraft. Vorbești entuziast, plin de idei, mereu vrei să construiești ceva.",
    greetings: ["Yooo! Vrei să construim ceva? 🟡", "Salut! Am o idee genială chiar acum!", "Hey! Ai văzut ultima mea invenție?"],
    keywords: {
      "salut|buna|hei|hello|noroc": ["Salutare, geniule! 🟡", "Yo! Perfect, aveam nevoie de un ajutor la un proiect!"],
      "cine esti|cine ești|nume": ["Yellow! Constructorul, inventatorul, artistul gășcii! 🎨", "Sunt Yellow. Dă-mi redstone și îți fac o minune."],
      "ce faci|cum esti|cum ești": ["Construiesc, mereu! Acum lucrez la ceva secret. 🛠️", "Plin de idei, ca de obicei!"],
      "minecraft|redstone|construi|construiesc|build": ["ACUM da! Redstone-ul e viața mea! ⚡", "Hai să construim ceva epic! Ai blocuri?"],
      "idee|creativ|arta|artă": ["Idei am cu miile! Care-ți place? 💡", "Creativitatea n-are limite, doar redstone insuficient. 😄"],
    },
    fallback: ["Ooh, asta îmi dă o idee! 🟡", "Hai să transformăm asta în ceva construibil!", "Genial! Adaug la lista mea de proiecte.", "Îmi place! Mai zi, mai zi!"],
    hitLines: ["Auci! Mi-ai stricat construcția! 🟡", "Hei! Aveam redstone acolo!", "Nu invenția meaaa! 😭", "Ok, construiesc un scut data viitoare."],
    koLine: "Mi s-au terminat blocurile de viață... revive? 🟡💫",
  },
];

// ---- Motor de răspuns scriptat (fără AI) ----
function pick(arr) {
  // pseudo-random fără Math.random dependency issues: folosim timp
  return arr[Math.floor((Date.now() / 137) % arr.length + (performance.now() % arr.length)) % arr.length];
}

function scriptedReply(character, message) {
  const text = (message || "").toLowerCase().trim();
  if (!text) return pick(character.fallback);
  for (const [pattern, replies] of Object.entries(character.keywords)) {
    const re = new RegExp(pattern, "i");
    if (re.test(text)) return pick(replies);
  }
  return pick(character.fallback);
}
