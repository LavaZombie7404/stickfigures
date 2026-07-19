// Gașca de stick-figures Alan Becker. Orange (Second Coming) = cap mare, gol (contur).
// Ceilalți = cap umplut. Replici scurte care apar deasupra capului.

const CHARACTERS = [
  {
    id: "orange", name: "Orange", color: "#FF8C1A", hollowHead: true, headR: 20,
    chatter: ["Ce zi frumoasă!", "Aventură?", "Hmm...", "Pe unde o iau?", "Liniște...", "🟠"],
    hitLines: ["Au!", "Hei!", "De ce?!", "Ok, ok!", "😵"],
    fightLines: ["Vino încoace!", "Hai!", "Te-am prins!", "Nu scapi!"],
  },
  {
    id: "red", name: "Red", color: "#E63329", hollowHead: false, headR: 13,
    chatter: ["Grrr.", "Vreau o bătaie.", "Plictisit.", "Cine-i tare?", "Hmph."],
    hitLines: ["ASTA-I TOT?!", "Grrr!", "Acum mă enervez!", "🔥"],
    fightLines: ["ADU-O!", "Ești mort!", "Haha!", "Prea slab!"],
  },
  {
    id: "green", name: "Green", color: "#46B84B", hollowHead: false, headR: 13,
    chatter: ["Pace...", "Respir.", "Zen.", "Frumos.", "Liniște, prieteni."],
    hitLines: ["Ei, chiar?", "Rămân calm...", "Pace!", "🌿"],
    fightLines: ["Nu vreau asta!", "Oprește-te!", "Bine, bine!", "Doar mă apăr!"],
  },
  {
    id: "blue", name: "Blue", color: "#3B7DD8", hollowHead: false, headR: 13,
    chatter: ["Calculez...", "Logic.", "Optimizez.", "Interesant.", "Hmm, un bug?"],
    hitLines: ["Eroare!", "Aaah!", "Sunt fragil!", "😱"],
    fightLines: ["Strategie!", "Am un plan!", "Nu așa!", "Calculez fuga!"],
  },
  {
    id: "yellow", name: "Yellow", color: "#F5C518", hollowHead: false, headR: 13,
    chatter: ["Construiesc!", "O idee!", "Redstone!", "Genial!", "Ce mai fac?"],
    hitLines: ["Construcția mea!", "Auci!", "Nu inventia!", "😭"],
    fightLines: ["Am un scut!", "Stai!", "Invenție de atac!", "Poc!"],
  },
];
