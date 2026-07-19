// Gașca Alan Becker. Orange (Second Coming) = cap mare, gol (contur). Ceilalți = umplut.
// Replici scurte care apar deasupra capului: la mers (chatter), la lovire, la bătaie.

const CHARACTERS = [
  {
    id: "orange", name: "Orange", color: "#FF8C1A", hollowHead: true, headR: 30,
    chatter: ["Ce zi frumoasă!", "Aventură?", "Hmm...", "Liniște...", "Pe unde o iau?"],
    hitLines: ["Au!", "Hei!", "De ce?!", "Ok, ok!"],
    fightLines: ["Hai!", "Vino încoace!", "Te-am prins!"],
  },
  {
    id: "red", name: "Red", color: "#E63329", hollowHead: false, headR: 20,
    chatter: ["Grrr.", "Vreau o bătaie.", "Plictisit.", "Cine-i tare?"],
    hitLines: ["ASTA-I TOT?!", "Grrr!", "Mă enervez!"],
    fightLines: ["ADU-O!", "Ești mort!", "Haha!"],
  },
  {
    id: "green", name: "Green", color: "#46B84B", hollowHead: false, headR: 20,
    chatter: ["Pace...", "Zen.", "Frumos.", "Liniște."],
    hitLines: ["Ei, chiar?", "Rămân calm...", "Pace!"],
    fightLines: ["Nu vreau!", "Oprește-te!", "Doar mă apăr!"],
  },
  {
    id: "blue", name: "Blue", color: "#3B7DD8", hollowHead: false, headR: 20,
    chatter: ["Calculez...", "Logic.", "Interesant.", "Un bug?"],
    hitLines: ["Eroare!", "Aaah!", "Sunt fragil!"],
    fightLines: ["Am un plan!", "Strategie!", "Nu așa!"],
  },
  {
    id: "yellow", name: "Yellow", color: "#F5C518", hollowHead: false, headR: 20,
    chatter: ["Construiesc!", "O idee!", "Redstone!", "Genial!"],
    hitLines: ["Auci!", "Construcția mea!", "Nu inventia!"],
    fightLines: ["Am un scut!", "Poc!", "Stai!"],
  },
];
