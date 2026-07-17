// Import ponctuel du mobilier/architecture Amoné (aménagement, pas des fournisseurs classiques)
// depuis "MERCURIALE MOBILIER AMONE V7 (4).xlsx" — groupé par zone du restaurant.
// Script idempotent : peut être relancé, remplace les articles existants de chaque zone.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// [référence (lien), désignation, commande, prix unitaire HT]
type ItemTuple = [string | null, string, number, number | null];

type ZoneData = {
  name: string;
  notes: string;
  items: ItemTuple[];
};

const zones: ZoneData[] = [
  {
    name: "Mobilier — Salle",
    notes: "Liste d'aménagement / mobilier (pas un fournisseur classique) — import MERCURIALE MOBILIER AMONE V7",
    items: [
      [null, "Papier peint Jade gris beige clair | Papier peint des années 70", 0, 95.9],
      [null, "Plaquette de parement béton effet roche Elgon intérieur / extérieur | Leroy Merlin — Pour salle", 0, 18.9],
      [null, "Assortiment 4 Patin de pied de meuble en feutre adhésif STANDERS Ø50 mm | Leroy Merlin — A prendre en fonction du nombre de table / CREABOIS", 0, 2.5],
    ],
  },
  {
    name: "Mobilier — Toilettes",
    notes: "Liste d'aménagement / mobilier (pas un fournisseur classique) — import MERCURIALE MOBILIER AMONE V7",
    items: [
      ["https://www.leroymerlin.fr/produits/poubelle-a-pedale-acier-adelar-3l-rose-mat-spirella-82546537.html", "Poubelle à pédale Adelar 3L rose mat — Spirella", 1, 33],
      [null, "Set de salle de bain 4 pièces en céramique rose | Leroy Merlin — rose obligatoire", 1, 40],
      ["https://www.leroymerlin.fr/produits/siege-wc-avec-abaissement-automatique-rosa-rose-89565032.html?megaBoost=&at_medium=Search%2Bengines&at_source=google&at_campaign=fiche-gratuite", "Siège WC avec abaissement automatique Rosa rose", 1, 44],
      ["https://www.leroymerlin.fr/produits/porte-papier-toilette-mural-laiton-antique-support-de-rouleau-de-salle-de-bain-retro-porte-rouleau-de-papier-wc-96343253.html", "Porte-papier toilette mural laiton antique rétro", 1, 12],
      [null, "Ceramia PixL Cuvette suspendue en céramique sans bride Tornado Quiet et fixations invisibles + abattant sofclose, rose (CEPX010RTORPPM) | Leroy Merlin — Non obligatoire / dépendra des WC actuel", 1, 299],
      [null, "Porte-rouleau supplémentaire Nova chromé | Leroy Merlin — NON OBLIGATOIRE", 1, 20],
      ["https://www.leroymerlin.fr/produits/lindby-plafonnier-led-henja-laiton-vieilli-32-cm-intensite-variable-eclairage-led-lampe-led-luminaire-plafonnier-lampe-plafond-eclerage-92885246.html", "Plafonnier LED Henja laiton vieilli 32cm — Lindby", 1, 67],
      [null, "2 poignées sur plaque à condamnation Agathe aluminium laiton mat, entraxe 195 mm | Leroy Merlin", 1, 20],
      [null, "Carrelage mur intérieur effet relief rose Mattie l.10 x L.10 cm | Leroy Merlin — Pour tout le bas des toilette à 130cm. + prévoir baguette séparation papiers peint", 0, 32],
      ["https://www.wellpapers.com/papier-peint/papier-peint-768-la-valse-des-lianes?epik=dj0yJnU9YUJTc19Rc1FTRkoybXFIc0VVX0FfSjlKQW9YQ281MTcmcD0wJm49TWprRW0xYXBGd0pVWUhGbE9hRkNnZyZ0PUFBQUFBR2xGRUhR", "Papier peint 768 — La valse des lianes", 0, 39],
      [null, "Meuble Lave-mains Thermis 40 x 22 cm Rose Mat - | Leroy Merlin", 0, 199],
      [null, "Lave-mains d'angle suspendu - Rétro - 42 x 29 cm - Richmond — Robinet non fourni à prévoir au choix. Siphon à prévoir également. Substitut à la colonne si toilette petit", 1, 195],
      [null, "Lavabo sur colonne rétro - 61cm - Ryther — Robinet non fourni à prévoir au choix. Siphon à prévoir également.", 1, 150],
      [null, "Mitigeur lavabo rétro à levier unique - Choix de finitions - Elizabeth — proposition robinet / Non obligatoire", 1, 240],
    ],
  },
  {
    name: "Mobilier — Sol & Cuisine",
    notes: "Liste d'aménagement / mobilier (pas un fournisseur classique) — import MERCURIALE MOBILIER AMONE V7",
    items: [
      [null, "Carrelage sol extérieur effet pierre beige Monastère l.80.5 x L.80.5 cm x Ep.9 m | Leroy Merlin — Prendre les plinthes également. Proposé lors de la commande", 0, null],
      [null, "Tomette ancienne en terre cuite 16x16 cm | BCA Matériaux Anciens — Le sol est très important pour l'ADN des projets. Joint gris", 0, 82],
      [null, "Sol PVC beige pour professionnels   OU      — Sol anti-dérapant cuisine", 0, 89.9],
      [null, "Découvrez notre rouleau de sol PVC Tarasafe — Sol anti-dérapant cuisine", 0, 16.5],
      [null, "Vestiaire en L à monter- Espace Equipement — quantité à définir via plan aménagement. Possible de sourcer ailleurschez emmaus ou leboncoin notamment", 1, 186],
      [null, "Joint gris clair", 1, 14.95],
      [null, "Carrelage sol intérieur / mur intérieur effet pierre ivoire Master l.60 x L.60 c | Leroy Merlin — Carrelage pour mur de la cuisine complet", 0, 29.9],
      ["https://www.amazon.fr/dp/B07YSTFKC7?ref=ppx_pop_mob_ap_share&th=1", "Cadre affichage cuisine (lot de 4)", 2, 19],
    ],
  },
  {
    name: "Mobilier — Décoration",
    notes: "Liste d'aménagement / mobilier (pas un fournisseur classique) — import MERCURIALE MOBILIER AMONE V7",
    items: [
      ["https://www.leroymerlin.fr/produits/decoration/cadre-photo/cadre-photo-en-bois/cadre-milo-13-x-18-cm-chene-inspire-86487469.html", "Cadre photo Milo 13x18cm chêne — Leroy Merlin", 5, 5.9],
      ["https://www.leroymerlin.fr/produits/cadre-abeilles-h-18-x-l-13-cm-noir-emde-dumont-85474456.html", "Cadre Abeilles 18x13cm noir — Emde & Dumont", 1, 14.9],
      [null, "Clayre & Eef Cadre photo 13x18 cm Marron | Leroy Merlin — Pour origine des viandes, accrocher derrière comptoir", 1, 14.9],
      [null, "Cadre photo Design Éternel ébène 20x30/A4 cm | Leroy Merlin — Utilisation pour affichage obligatoire ; interdiction de fumer, marianne, licence petite restauration, alcool mineur; Affiches à acheter voir Gantt. X4", 4, 10.9],
      [null, "Bande adhésive double face ultra puissant, adhésif armé /spécial plinthe souple ou rigide /sol PVC et crédence - 5 mètres - 50 mm（paquet de 3） | Leroy Merlin — Double scotch pour fixer et faire tenir les bibelots sur étagères et du vaisselier", 1, 20],
      [null, "Bombe de peinture Relook tout MAISON DECO cuivre satiné 400 ml | Leroy Merlin — Il est important de bomber les cadres des prises pour un meilleur rendu", 0, 16],
      [null, "Cadre simple interrupteur/prise encastrable | Leroy Merlin", 0, 1],
      ["https://www.amazon.fr/dp/B09PF17ZR7?ref=cm_sw_r_ud_dp_75X8C43B5NJ19WWW5M3D&ref_=cm_sw_r_ud_dp_75X8C43B5NJ19WWW5M3D&social_share=cm_sw_r_ud_dp_75X8C43B5NJ19WWW5M3D&starsLeft=1&skipTwisterOG=1", "Enceinte décorative", 1, 35],
      ["https://www.cuckoopalace.fr/Horloge-coucou-traditionnelle-mouvement-a-quartz-35cm-de-Trenkle-Uhren/034-35-0QM", "Horloge coucou traditionnelle 35cm — Trenkle Uhren", 1, 192],
      ["https://www.leroymerlin.fr/produits/quincaillerie/cheville-vis-clou-et-boulon/crochet/crochet-garage/crochet-porte-manteau-3-pieces-patere-vintage-ceramique-porte-manteau-mural-alliage-de-zinc-avec-6-vis-patere-murale-pour-suspendre-vetements-cha-94047813.html", "Crochets porte-manteau vintage céramique (3 pièces)", 0, 9],
      [null, "Lot de 2 crochets de porte en fonte motif fleurs | Leroy Merlin", 0, 6.99],
      [null, "Livraison express - Casier à vin en bois artisanal pour bouteilles et verres dans votre choix de couleurs // 90 cm de large // Livraison gratuite // Durable - Etsy France — choisir : GH 8 DB abgeetzt // Nuss dunkel (W)", 1, 61],
      [null, "Farelek Baleares Ventilateur de plafond 132 cm Brun : Amazon.fr: Cuisine et Maison — Possible de sourcer un autre modèle vintage chez emmaus ou autre. Bien faire attention à la hauteur du plafond.", 0, 89],
      [null, "ELYRIA | Paxel Store — MODELE D", 0, 129],
      [null, "CORAILI - COLLECTION | Paxel Store — MODELE ROSE", 0, 29],
      [null, "FINTELAS | Paxel Store — MODELE G", 0, 129],
      [null, "FINTELAS | Paxel Store — MODELE B", 0, null],
      [null, "Applique Vintage Laiton Verre Satiné Ondulé | Ghidini 1849 — OAS Laiton Antique", 0, 84],
      [null, "Lanterne murale d'extérieur vintage or antique - Antigua Up | Lampeetlumiere", 0, 33],
      [null, "Ampoule led à filament, flamme, E14, 250lm = 25W, blanc chaud, LEXMAN | Leroy Merlin — Ampoule pour vos lampes décoration ; à défnir le nombre en fonction de votre implantation. 25W max", 0, 3.99],
      [null, "Peinture Mur Interieur - Metaltop - Rouge vin - RAL 3005 - Pot 15L | Leroy Merlin", 0, null],
    ],
  },
];

async function upsertZone(restaurantId: string, data: ZoneData) {
  const items = data.items.map(([reference, designation, orderQuantity, unitPriceHT]) => ({
    reference,
    designation,
    packaging: null,
    orderQuantity,
    unitPriceHT,
    casePriceHT: null,
  }));

  const existing = await prisma.supplier.findFirst({ where: { restaurantId, name: data.name } });
  if (existing) {
    await prisma.supplierItem.deleteMany({ where: { supplierId: existing.id } });
    await prisma.supplier.update({
      where: { id: existing.id },
      data: { notes: data.notes, items: { create: items } },
    });
  } else {
    const last = await prisma.supplier.findFirst({ where: { restaurantId }, orderBy: { order: "desc" } });
    await prisma.supplier.create({
      data: {
        name: data.name,
        restaurantId,
        order: (last?.order ?? -1) + 1,
        notes: data.notes,
        items: { create: items },
      },
    });
  }
}

async function main() {
  const restaurant = await prisma.restaurant.upsert({
    where: { slug: "amone-nice" },
    update: {},
    create: { name: "Amoné Nice", slug: "amone-nice" },
  });

  let totalItems = 0;
  for (const zone of zones) {
    await upsertZone(restaurant.id, zone);
    totalItems += zone.items.length;
  }
  console.log(`Importé : ${zones.length} zones, ${totalItems} articles.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
