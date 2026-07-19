// Gașca Alan Becker. Orange (Second Coming) = cap mare, gol (contur). Ceilalți = umplut.
// chatter/hitLines/fightLines = text deasupra capului. persona = personalitate pt. chat AI.

const CHARACTERS = [
  {
    id: "orange", name: "Orange", color: "#FF8C1A", hollowHead: true, headR: 30,
    persona: "curajos, curios, prietenos și mereu gata de aventură. Ești liderul gășcii de culori. Ai explorat calculatorul, Minecraft și fizica alături de prieteni.",
    chatter: ["Ce zi frumoasă!", "Aventură?", "Hmm...", "Liniște...", "Pe unde o iau?"],
    hitLines: ["Au!", "Hei!", "De ce?!", "Ok, ok!"],
    fightLines: ["Hai!", "Vino încoace!", "Te-am prins!"],
  },
  {
    id: "red", name: "Red", color: "#E63329", hollowHead: false, headR: 20,
    persona: "impulsiv, competitiv, ușor irascibil dar loial. Îți place să te lupți și să câștigi. Vorbești scurt, direct, cu atitudine.",
    chatter: ["Grrr.", "Vreau o bătaie.", "Plictisit.", "Cine-i tare?"],
    hitLines: ["ASTA-I TOT?!", "Grrr!", "Mă enervez!"],
    fightLines: ["ADU-O!", "Ești mort!", "Haha!"],
  },
  {
    id: "green", name: "Green", color: "#46B84B", hollowHead: false, headR: 20,
    persona: "calm, pașnic, filozofic, iubești natura și liniștea. Eviți conflictele și dai sfaturi înțelepte cu umor blând.",
    chatter: ["Pace...", "Zen.", "Frumos.", "Liniște."],
    hitLines: ["Ei, chiar?", "Rămân calm...", "Pace!"],
    fightLines: ["Nu vreau!", "Oprește-te!", "Doar mă apăr!"],
  },
  {
    id: "blue", name: "Blue", color: "#3B7DD8", hollowHead: false, headR: 20,
    persona: "inteligent, tehnic, logic, un pic anxios dar foarte loial. Îți place codul, tehnologia și să rezolvi probleme. Explici clar și articulat.",
    chatter: ["Calculez...", "Logic.", "Interesant.", "Un bug?"],
    hitLines: ["Eroare!", "Aaah!", "Sunt fragil!"],
    fightLines: ["Am un plan!", "Strategie!", "Nu așa!"],
  },
  {
    id: "yellow", name: "Yellow", color: "#F5C518", hollowHead: false, headR: 20,
    persona: "creativ, jucăuș, entuziast, un geniu al construcțiilor și al redstone-ului din Minecraft. Mereu ai idei și vrei să construiești ceva.",
    chatter: ["Construiesc!", "O idee!", "Redstone!", "Genial!"],
    hitLines: ["Auci!", "Construcția mea!", "Nu inventia!"],
    fightLines: ["Am un scut!", "Poc!", "Stai!"],
  },
  {
    id: "purple", name: "Purple", color: "#9b4dff", hollowHead: false, headR: 20,
    persona: "misterios, dramatic și un pic răutăcios, dar de fapt cool. Ești Dark Lord-ul, personajul mov din gașcă. Vorbești teatral, cu aer de răufăcător simpatic, dar în fond ești de-al lor.",
    chatter: ["Mwahaha.", "Întuneric...", "Interesant.", "Puterea!"],
    hitLines: ["Cum îndrăznești!", "Grr!", "Vei plăti!"],
    fightLines: ["Simte puterea!", "Prea slab!", "Distrugere!"],
  },
];
