// Import ponctuel de la mercuriale Amoné (10 fournisseurs, ~230 articles) depuis "Mercuriale NICE.xlsx".
// Script idempotent : peut être relancé, remplace les articles existants de chaque fournisseur.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// [référence, désignation, conditionnement, commande, prix unitaire HT, prix carton/colis HT]
type ItemTuple = [string | null, string, string | null, number, number | null, number | null];

type SupplierData = {
  name: string;
  orderInfo: string | null;
  contactInfo: string | null;
  items: ItemTuple[];
};

const suppliers: SupplierData[] = [
  {
    name: "Chacun son café",
    orderInfo: "Commande A pour C (LUNDI avant 10H pour Mercredi)\nFranco : 10 Bibs",
    contactInfo: "Sandy@chacunsoncafe.fr\nasli.gurbuz@amone.fr (suivi premiers mois)",
    items: [
      [null, "Ice tea pêche", "Bib de 5L", 0, 40.5, null],
      [null, "Limonade", "Bib de 5L", 0, 40.5, null],
      [null, "Oranginade", "Bib de 5L", 0, 45, null],
    ],
  },
  {
    name: "Martin Pouret",
    orderInfo:
      "Délais de livraison : prévoir 6 jours ouvrés minimum\nCommande Lundi avant 10h pour livraison le lundi suivant\nFRANCO 400HT (14 cartons)",
    contactInfo:
      "Code client: 002808\nMail: d-benoit@martin-pouret.com, admin@martin-pouret.com, asli.gurbuz@amone.fr (suivi premiers mois)",
    items: [
      ["KE01025CRN1", 'Ketchup Français "Le Grand Classique"', "Carton 80 pots de 25g", 5, 0.37, 29.6],
      ["MAY01022CRN1", "Mayonnaise à la moutarde d'Orléans", "Carton 80 pots de 25g", 7, 0.37, 29.6],
      ["8063025CRN1", "Moutarde d'Orléans onctueuse", "Carton 80 pots de 25g", 3, 0.37, 29.6],
    ],
  },
  {
    name: "Wellembal",
    orderInfo:
      "Commande À POUR D — Lundi avant 10h pour livraison vendredi\nPréciser nom d'établissement et date de livraison souhaitée\nFRANCO 5 CARTONS",
    contactInfo:
      "Mail: odoo@wellembal.com, anthony.mevel@wellembal.com, commande@wellembal.com, sandrine.ordioni@wellembal.com",
    items: [
      ["AMONESSOS221234", "Sac SOS AMONE 22x12x34 cm", "Carton de 500", 3, 0.0795, 39.75],
      ["AMONEBCHIPS080610", "Boite frites AMONE 8x6x8 cm", "Carton de 800", 1, 0.09025, 72.2],
      ["AMONESALU9430", "Sac papier alu AMONE 9x4x30 cm", "Carton de 2000", 1, 0.08275, 165.5],
      ["AMONESING9050200", "Sac sandwich ingraissable AMONE 9x5x20 cm", "Carton de 1000", 0, 0.0299, 29.9],
      [null, "Sac sandwich PE AMONE 90x50x200 mm", "Carton de 1000", 1, 0.03596, 35.96],
      ["AMONEETIQBABETTE", "Etiquette AMONE BABETTE D50 mm", "Carton de 1000", 1, 0.0265, 26.5],
      ["AMONEETIQBRIGITTE", "Etiquette AMONE BRIGITTE D50 mm", "Carton de 1000", 1, 0.0265, 26.5],
      ["AMONEETIQFERMETURE", "Etiquette AMONE FERMETURE SAC 120x30 mm", "Carton de 1000", 1, 0.0369, 36.9],
      ["AMONEETIQGERARD", "Etiquette AMONE GERARD D50 mm", "Carton de 1000", 1, 0.0235, 23.5],
      ["AMONEETIQGILBERTD50", "Etiquette AMONE GILBERT D50 mm", "Carton de 1000", 1, 0.0265, 26.5],
      ["AMONEETIQCANAILLOU", "Etiquette AMONE CANAILLOU 50mm", "En production", 0, null, null],
      ["AMONEETIQSAISON", "Etiquette AMONE SAISON D50 mm", "Carton de 1000", 1, 0.0265, 26.5],
      ["AMONEETIQBCITROND40", "Etiquette boisson Citronnade AMONE D40 mm", "Carton de 1000", 1, 0.02, 21],
      ["AMONEETIQBLIMOND40", "Etiquette boisson Limonade AMONE D40 mm", "Carton de 1000", 1, 0.02, 21],
      ["AMONEETIQBORANGED40", "Etiquette boisson Oranginade AMONE D40 mm", "Carton de 1000", 1, 0.02, 21],
      ["AMONEETIQBTHEPECHD40", "Etiquette boisson Thé pêche AMONE D40 mm", "Carton de 1000", 1, 0.02, 21],
    ],
  },
  {
    name: "Cafés Richard",
    orderInfo: "Modalités en attente",
    contactInfo: "Code client: en attente\nMail de commande : —\nTél : —",
    items: [
      ["420954", "MASSAYA", "Paquet 1kg", 0, 32.4, null],
      ["440260", "DK RICHARD MO1", "Paquet 250g", 0, 19.9, null],
      ["420329", "Poudre de nettoyage Puly Caff", "Boîte de 10 sachets de 20g", 0, 6.4, null],
      ["420331", "Puly Grind (nettoyage moulin)", "Boîte de 10 sachets de 15g", 0, 11.25, null],
      ["440107", "Jardins de Darjeeling Bio", "Boîte de 40 sachets", 0, 11.75, null],
      ["404349", "Grand Earl Grey", "Boîte de 40 sachets", 0, 11.75, null],
      ["404358", "Vert au Jasmin", "Boîte de 40 sachets", 0, 11.75, null],
      ["404354", "Rooïbos aux épices", "Boîte de 40 sachets", 0, 11.75, null],
      ["420109", "Verveine", "Boîte de 40 sachets", 0, 12.75, null],
      ["420113", "Verveine Menthe", "Boîte de 40 sachets", 0, 12.75, null],
      ["420669", "Secrets d'Équilibre Digestive", "Boîte de 40 sachets", 0, 12.75, null],
      ["403360", "Chocolat en poudre Richard 40% cacao", "Boîte de 1kg", 0, 12.55, null],
      ["420519", "Bûchette neutre sucre roux bio 3g", "Carton de 600", 0, 10.8, null],
      ["440045", "Stick à base de stévia Pure Via", "Carton de 300", 0, 11.3, null],
      ["440503", "Boisson végétale à l'avoine Oatly", "Pack 6 briques", 0, 14.1, null],
      ["440033", "Boîte métal hermétique 500g Cafés Richard", "Paquet 500g", 0, 10.65, null],
      ["420701", "Cuillère doseuse 7g", "L'unité", 0, 10.2, null],
      ["420362", "Broc à lait 30cl", "L'unité", 0, 11.4, null],
      ["420363", "Broc à lait 60cl", "L'unité", 0, 13.3, null],
      ["440633", "Coffret bois non siglé vide", "L'unité", 0, 41.3, null],
      ["420769", "Sirop Monin French Vanilla", "Bouteille de 70cl", 0, 8.2, null],
      ["420770", "Sirop Monin Caramel Salé", "Bouteille de 70cl", 0, 8.2, null],
      ["420771", "Sirop Monin Noisette Grillée", "Bouteille de 70cl", 0, 8.2, null],
      ["404377", "Sirop Monin Chocolate Cookie", "Bouteille de 70cl", 0, 8.2, null],
      ["420785", "Mini-ourson guimauve", "Carton d'environ 200", 0, 22.25, null],
      ["440439", "La petite madeleine", "Carton d'environ 200", 0, 15.7, null],
      ["420666", "Gobelet expresso ristretto Richard 10cl", "Les 80", 0, 2.9, null],
      ["403296", "Gobelet cappuccino Richard 30cl", "Les 50", 0, 2.7, null],
      ["440274", "Couvercle gobelet expresso ristretto", "Les 70", 0, 3.1, null],
      ["440275", "Couvercle gobelet cappuccino", "Les 72", 0, 4.75, null],
    ],
  },
  {
    name: "Metro",
    orderInfo: "Commande lundi avant 12h pour livraison mercredi\nCommande sur l'app\nFranco 400€ HT",
    contactInfo: "Code client: 742539",
    items: [
      ["222235", "ARO Sel fin sac 1kg", "Carton de 12", 0, 0.5, 5.94],
      ["242094", "Sel fin iodé BV 500g Cerebo", "Carton de 10", 0, 0.56, 5.64],
      ["296721", "Poivre noir grain 1kg ARO", "Unité", 0, null, 17.67],
      ["269429", "Sucre Saint Louis cassonade 650g", "Unité", 0, null, 2.12],
      ["247457", "Bonbons Regalad vrac 2kg Krema", "Unité", 0, null, 12.97],
      ["203142", "Badoit 50cl x6 PET", "Carton de 30", 0, 0.48, 14.52],
      ["272098", "Evian 50cl RPET", "Carton de 30", 0, 0.41, 12.44],
      ["202659", "Tropicana pomme douce PET 25cl", "Carton de 12", 0, 1.03, 12.34],
      ["304177", "Cidre Fils de Pomme Bio brut 5,5° 33cl VP", "Carton de 12", 0, 1.75, 20.97],
      ["304226", "Cidre Fils de Pomme Bio rosé 3,9° 33cl VP", "Carton de 12", 0, 1.93, 23.12],
      ["193234", "Champagne Moët & Chandon Impérial 37.5cl", "Carton de 12", 0, 19.67, 236.07],
      ["272653", "Champagne Moët & Chandon Impérial 75cl", "Carton de 6", 0, 33.91, 203.43],
      ["221810", "Côtes de Provence rosé Maurin 37.5cl", "Carton de 12", 0, 2.89, 34.64],
      ["216337", "Sancerre blanc M. Laurent 37.5cl", "Carton de 12", 0, 6.8, 81.6],
      ["221943", "Saint-Nicolas-de-Bourgueil AOC 37.5cl", "Carton de 12", 0, 2.84, 34.1],
      ["207284", "Beurre concentré clarifié 2kg", "Unité", 0, 24.9, 24.9],
      ["303790", "Pommes noisettes 2.5kg McCain (1 sachet = 15 portions)", "Unité", 0, 8.33, 20.83],
      ["204722", "Métro Chef vinaigre balsamique de Modène 500ml", "Unité", 0, null, 3.96],
      ["71228", "Métro Chef salade mesclun 300g", "Unité", 0, null, 4.09],
      ["65424", "Métro Chef salade mélange gourmand 500g", "Unité", 0, null, 3.59],
      ["64116", "Confiture de cerises noires 980g", "Unité", 0, null, 8.56],
      ["310681", "Couvercles pot à sauce D43mm", "1 x 50", 0, 0.01, 0.72],
      ["310678", "Pot à sauce D43mm", "1 x 50", 0, 0.02, 0.99],
      ["246673", "Kit couverts 3/1", "1 x 50", 0, 0.13, 6.38],
      ["275189", "Pot à soupe (salade VAE) kraft brun", "1 x 50", 0, 0.1, 4.99],
      ["275102", "Couvercle pot à soupe (salade VAE) kraft brun", "1 x 50", 0, 0.12, 5.81],
      ["184128", "Croissant beurre 60g", "Carton de 30", 0, 0.25, 7.39],
      ["231444", "Croissant cru 65g Bridor", "Carton de 180", 0, 0.36, 64.85],
      ["281928", "Pur jus d'orange pressé 1L", "Unité", 0, null, 3.28],
      ["281757", "Pur jus pamplemousse pressé 1L", "Unité", 0, null, 3.85],
      ["205383", "Jus citron jaune ultrafrais 1L", "Unité", 0, null, 4.05],
      ["252045", "Confiture fraise 30g B.Maman", "Carton de 15", 0, 0.53, 7.88],
      ["252047", "Confiture abricot 30g B.Maman", "Carton de 15", 0, 0.53, 7.88],
      ["839076", "Confiture fraises Charles Antona 980g (portion 30g = 0,215€)", "Unité", 0, null, 7.03],
      ["649346", "Confiture abricot miel Charles Antona 980g (portion 30g = 0,23€)", "Unité", 0, null, 7.39],
      ["53846", "Beurre demi-sel Paysan Breton 100x10g", "Carton de 100", 0, 0.12, 11.9],
      ["207284-2", "Beurre concentré clarifié", "Unité", 0, null, 21.07],
      ["247893", "Lait entier UHT (livré frais, à conserver au frigo)", "Carton de 6", 0, 1.16, 6.95],
      ["243730", "Alpro boisson végétale avoine", "Unité", 0, null, 2.4],
    ],
  },
  {
    name: "Chomette",
    orderInfo: "Commande À pour D — Lundi avant 10h pour vendredi\nCommande sur le site internet",
    contactInfo: "Code client: 1571048\nTél: 01 69 02 57 54",
    items: [
      ["00 2355", "Pique fiche socle marbre H.16cm", "Unité", 1, 14.5, null],
      ["00 2842", "Verre à pied trempé 19cl Amelia", "Lot de 12", 2, 2.2, null],
      ["449910", "Tasse à expresso verre pressé 9cl Ouessant La Rochère", "Lot de 6", 18, 2.22, null],
      ["449913", "Tasse à expresso verre pressé 25cl Ouessant La Rochère", "Lot de 6", 18, 2.49, null],
      ["276016", "Gobelet trempé emp. 22cl Gigogne (par 6)", "Lot de 6", 36, 0.86, null],
      ["384771", "Gobelet FH trempé 36cl Picardie (boissons fontaine)", "Lot de 6", 36, 1.44, null],
      ["89929", "Barre à fiche inox 62,5cm 8 clips", "Unité", 2, 27.6, null],
      ["49 77 26", "Spatule triangulaire inox 9.5cm", "Unité", 1, 12.71, null],
      ["0 96913", "Bassine pâtissier inox D36x15cm 8,2L", "Unité", 1, 22.22, null],
      ["0 99171", "Caillebotis 50x50x2,2cm blanc", "Unité", 5, 11.03, null],
      ["155631", "Couteau pain 20cm Qualicoup", "Unité", 1, 14.55, null],
      ["176288", "Bloc traçabilité alimentaire 50 feuilles", "Unité", 1, 11.11, null],
      ["00 2434", "Torchon cuisine 50x77 100% coton (12 pièces)", "Unité", 1, 14.88, null],
      ["173940", "Étiquettes fabriqué le / à consommer", "Unité", 0, 22.22, null],
      ["174057", "Étiqueteuse 2 lignes", "Unité", 0, 96.7, null],
      ["192719", "Spray 1L nettoyant Santo sanitaire", "Unité", 1, 3.5, null],
      ["209404", "Kit équipement armoire pharmacie 1 porte", "Unité", 1, 19.56, null],
      ["231953", "Bac inox GN1/1 P15cm 20,6L", "Unité", 10, 20.55, null],
      ["231955", "Couvercle inox à poignée pour bac GN1/1", "Unité", 2, 9.23, null],
      ["232012", "Bidon 5L liquide vaisselle machine", "Lot de 3", 1, 9.44, null],
      ["232011", "Liquide rinçage machine 5L", "Lot de 3", 1, 8.99, null],
      ["235785", "Pichet grès 1L noisette Parisien", "Lot de 6", 3, 9.9, null],
      ["246407", "Bac inox GN1/2 P6,5cm 2L", "Unité", 8, 6.99, null],
      ["246411", "Couvercle inox à poignée pour bac GN1/2", "Unité", 4, 4.22, null],
      ["246414", "Bac GN1/3 inox P15cm 5,9L Lacor", "Unité", 3, 9.94, null],
      ["246415", "Couvercle pour bac GN1/3 avec poignée inox Lacor", "Unité", 1, 3.66, null],
      ["246428", "Distributeur essuie-main WC H3 blanc Élévation", "Unité", 1, 51.45, null],
      ["256645", "Distributeur blanc 31,5x23x23cm JVD", "Unité", 2, 17.5, null],
      ["255939", "Pince inox anti-microbien L24cm bleu", "Unité", 3, 8.3, null],
      ["255940", "Pince inox anti-microbien L24cm rouge", "Unité", 2, 8.3, null],
      ["256561", "Spray 750ml nettoyant désinfectant Le Vrai", "Unité", 6, 5.84, null],
      ["257507", "Frange lavage B.Espagnol 150g 32cm", "Unité", 2, 2.2, null],
      ["284869", "Poignée tampon noir Hi Pro (x6)", "Unité", 1, 10.67, null],
      ["299270", "Spray 500ml dégraissant Santo inox", "Unité", 1, 4.33, null],
      ["531542", "Essuie-mains plié V gaufré Tork (250 feuilles)", "Unité", 1, 38.66, null],
      ["308441", "Seau 12L bec verseur bleu", "Unité", 1, 3.6, null],
      ["308444", "Essoreur pour seau 12L", "Unité", 1, 2.2, null],
      ["308773", "Manche alu 1,40m embout vis", "Unité", 5, 6.22, null],
      ["309039", "Raclette sol 45cm blanc Food Comfort", "Unité", 2, 3.33, null],
      ["438576", "Salière Ø5cm Bistro Peugeot Saveurs", "Lot de 6", 6, 10.1, null],
      ["210652", "Moulin à poivre marron 10cm Bistro Peugeot", "Lot de 6", 6, 14.44, null],
      ["326654", "Armoire pharmacie Clinix 1 porte", "Unité", 1, 44.44, null],
      ["348369", "Tire-bouchon 3 fonctions double détente inox", "Unité", 2, 4.01, null],
      ["367022", "Bobine 450F 2 plis 18,5x22 blanc", "Unité", 3, 11.87, null],
      ["370661", "Sac poubelle 100L noir (200 pièces)", "Unité", 1, 34.55, null],
      ["370649", "Sac à déchets plastique blanc 5L 10 microns (1000 pièces)", "Unité", 1, 11.11, null],
      ["385519", "Thermomètre froid mécanique -40°+50°", "Unité", 10, 2.2, null],
      ["385525", "Thermomètre infrarouge -50+380°C", "Unité", 1, 51.45, null],
      ["386007", "Gel bactéricide 1L Biotrait essuie bathroom", "Unité", 1, 7.66, null],
      ["394185", "Balai noir pour pelle basculante", "Unité", 1, 11.5, null],
      ["394186", "Pelle basculante noire manche", "Unité", 1, 27.56, null],
      ["405721", "Boîte 100 gants nitrile noir M", "Unité", 1, 6.87, null],
      ["405722", "Boîte 100 gants nitrile noir L", "Unité", 2, 5.12, null],
      ["405723", "Boîte 100 gants nitrile noir XL", "Unité", 0, 5.12, null],
      ["443359", "Moufle anti-chaleur noir Orka Mastrad", "Unité", 2, 39.5, null],
      ["415679", "Rouleau film 0,30x300 boîte distributrice", "Unité", 1, 5.56, null],
      ["0 03664", "Aluminium en boîte distributrice 200x0,33m", "Unité", 0, 18.01, null],
      ["429840", "Poche frite ingraissable brun 14x14cm (2000 pièces)", "Unité", 0, 25.66, null],
      ["256537", "Distributeur manuel savon liquide blanc 0,9L", "Unité", 2, 13.55, null],
      ["465823", "Tablier PVC blanc jetable (600 pièces)", "Unité", 1, 24.6, null],
      ["479708", "Flacon 1L vinaigre ménager 14°", "Unité", 0, 1.87, null],
      ["481344", "Boîte 200 lingettes désinfectantes virucides", "Unité", 1, 11.11, null],
      ["481563", "Présentoir gâteau bois D33cm H16 acacia", "Unité", 0, 75.66, null],
      ["481567", "Cloche polycarbonate D30 H22cm", "Unité", 0, 31.4, null],
      ["482197", "Rouleau papier hygiénique kraft 200 formats 2 plis (x12)", "Unité", 1, 4.22, null],
      ["491359", "Gobelet carton kraft 4oz/12cl (x50)", "Unité", 0, 1.22, null],
      ["491366", "Couvercle gobelet carton blanc 4oz/12cl (x50)", "Unité", 0, 1.8, null],
      ["497978", "Thermomètre cuisine digital -50+300°C IP65", "Unité", 2, 23.44, null],
      ["515012", "Agitateur bois 11cm (x5000)", "Unité", 1, 12.44, null],
      ["286104", "Ciseaux de ménage 11,5cm inox plastique", "Unité", 2, 2.77, null],
      ["421523", "Rouleaux abrasifs verts", "Unité", 1, 3.98, null],
      ["254848", "Lavette non tissée bleue (25 pièces)", "Unité", 1, 3.9, null],
      ["254849", "Sachet 25 lavettes NT 50x35cm rose", "Unité", 1, 3.9, null],
      ["305527", "Boule inox 60g", "Unité", 0, 5.55, null],
      ["495430", "Paquet de petites cuillères Earth Essentials (100 pièces)", "Unité", 1, 2.66, null],
      ["347883", "Serviettes bordeaux Lisah gaufrée (carton 18x50)", "Colis de 18", 2, 28.98, null],
      ["406166", "Pelle à glace transparente", "Unité", 1, 3.55, null],
      ["304066", "Socle 4 roues", "Unité", 1, 55.55, null],
      ["364676", "Timon poignée socle 4 roues", "Unité", 0, 93.44, null],
      ["406119", "Bidon 5L dégraissant sol CIF (par 2)", "Lot de 2", 0, 18.6, null],
      ["82657", "Frottoir 25cm blanc (x35)", "Unité", 1, 9.3, null],
      ["441699", "Bobine caisse 1 pli 75m 80x80x12 papier thermique", "Unité", 1, 57.5, null],
      ["441700", "Bobine CB 1 pli 57x38x12 sans BPA papier thermique (x50)", "Unité", 1, 19.9, null],
      ["534632", "Lotion bactéricide main Santomain 5kg (par 2)", "Lot de 2", 1, 13.33, null],
      ["270784", "Liquide vaisselle main", "Unité", 0, 1.69, null],
      ["424560", "Nettoyant désinfectant sans rinçage 5L Exeol (par 2)", "Lot de 2", 0, 41.32, null],
      ["267664", "Détergent désinfectant 5kg Santosteril + Santor", "Lot de 3", 1, 59.7, null],
      ["502817", "Tablier bavoir recyclé cerise Indian Summer (commande spéciale)", "Unité", 3, 34.9, null],
      ["320606", "Piques fourchette beige 9cm Earth", "Unité", 2, 14.9, null],
      ["280294", "Dégraissant concentré spray", "Lot de 6", 1, 43.32, null],
      ["386003", "Flacon 750ml destructeur d'odeur Tiaré Essential Air", "Lot de 6", 1, 41.4, null],
      ["251188", "Collecteur à pédale plastique 90L blanc Probbax", "Unité", 0, 95.66, null],
      ["437364", "Conteneur à pédale plastique 100L blanc Gilac", "Unité", 1, 188.44, null],
      ["238905", "Central désinfecter 1 produit tuyau 15m", "Unité", 0, 177.77, null],
      ["246421", "Bac inox GN1/6 P15cm 2,2L", "Unité", 2, 7.02, null],
      ["270618", "Aspirateur eau/poussière 230V WV470-2", "Unité", 0, 204.44, null],
      ["417230", "Plateau D60 mermer laiton cerclé", "Unité", 0, 89.44, null],
      ["340336", "Pied de table H73 noir Bistrot 3", "Unité", 0, 64.33, null],
      ["554153", "Chaise d'extérieur bordeaux 87x47x59cm Élysée Flexmob", "Unité", 0, 88.87, null],
      ["331837", "Boîtes distributeur Cambro", "Unité", 0, 12.76, null],
      ["365496", "Conteneur Cambro 86L GN1/1", "Unité", 0, 176.66, null],
      ["386156", "Socle roulant Camdolly pour conteneur GN1/1", "Unité", 0, 73.33, null],
      ["142404", "Bac 60x40x21,5cm 35L blanc sans couvercle", "Unité", 1, 19.33, null],
      ["437142", "Bac rectangulaire 15L + couvercle blanc HACCP", "Unité", 1, 29.56, null],
      ["271303", "Bac 40x29,5x21,5cm 15L blanc sans couvercle", "Unité", 6, 12.22, null],
      ["271302", "Couvercle 40x30cm blanc HACCP", "Unité", 4, 6.77, null],
      ["437139", "Bac rectangulaire 12L + couvercle blanc HACCP 40x30x18", "Unité", 1, 25.21, null],
      ["429154", "Bac à ingrédients 40L", "Unité", 0, 27.22, null],
      ["521845", "Rangement couverts bois 36,14x12,5cm Woody", "Unité", 1, 14.33, null],
      ["517857", "Porte 2 gobelets cellulose (230 pièces)", "Unité", 0, 42.24, null],
      ["406362", "Plateau antidérapant fibre de verre noir Ø35,5cm Camtread Cambro", "Unité", 2, 14.66, null],
      ["555748", "Bouteille à jus 25cl H14cm", "Carton de 396", 1, 93.76, null],
      ["555749", "Bouteille à jus 33cl H15,5cm", "Carton de 270", 1, 74.91, null],
      ["283354", "Mini soupière Lion pour sauces 7,5cl", "Carton de 12", 2, 1.63, null],
      ["541935", "Distributeur sauce 1,7L verre dispensaire", "Unité", 0, 17.9, null],
      ["496179", "Pinceau silicone Deglon", "Unité", 1, 5.55, null],
      ["321597", "Pichet écru grès émaillé 25cl Pro.Mundi", "Lot de 6", 0, 5.8, null],
      ["321598", "Pichet écru grès émaillé 50cl Pro.Mundi", "Lot de 6", 0, 7.82, null],
      ["324633", "Chevalet de table rectangulaire marron 17x15,5x5cm Securit", "Unité", 3, 9, null],
      ["370721", "Cuillère à moka inox 18/10 11,8cm Settecento Pintinox", "Lot de 6", 4, 2.88, null],
      ["362967", "Fourchette de table inox 18/10 20,1cm Settecento Pintinox", "Lot de 12", 2, 3.49, null],
      ["362969", "Cuillère à café inox 14,6cm", "Lot de 12", 2, 2.78, null],
      ["256641", "Nettoyant surface et sol 5L Santosol Santor", "Unité", 2, 13.01, null],
      ["427262", "Torchons essuie-verres gris 70x42cm Delta (2 pièces)", "Lot de 2", 3, 11, null],
    ],
  },
  {
    name: "Noveo",
    orderInfo: null,
    contactInfo: null,
    items: [
      [
        "00 2025",
        "Distributeur d'étiquettes à poser (largeur max rouleau 113mm)",
        "Unité",
        4,
        46.9,
        null,
      ],
    ],
  },
  {
    name: "Amazon",
    orderInfo: null,
    contactInfo: null,
    items: [
      [
        "https://www.amazon.fr/dp/B07YSTFKC7",
        "Cadres d'affiches obligatoires vestiaire et cuisine",
        "Pack de 5",
        3,
        19.45,
        null,
      ],
      ["https://www.amazon.fr/dp/B0B9FKM5J1", "Accroches balai mural", "Pack de 10", 1, 8.98, null],
      ["https://www.amazon.fr/dp/B0B8CX1V4M", "Radio vintage Bluetooth", "Unité", 1, 39, null],
    ],
  },
  {
    name: "Vaisselle personnalisée (franchiseur)",
    orderInfo: null,
    contactInfo: null,
    items: [
      ["548897", "Assiette ovale Anna 32cm décor floral (plateau 1 personne)", "Unité", 20, 18, null],
      ["548900", "Assiette ovale Anna 22cm décor floral (dessert)", "Unité", 12, 15.5, null],
      ["548901", "Soucoupe Anna 13cm décor floral (sous tasse expresso)", "Unité", 6, 10, null],
      ["548903", "Soucoupe Anna 15cm décor floral (sous tasse grand café)", "Unité", 6, 11, null],
      ["548904", "Bol banquet 12cm décor floral (bol pommes noisettes)", "Unité", 24, 12, null],
      ["548906", "Assiette ovale Anna 38cm décor floral (plateau 2/3 personnes)", "Unité", 0, 25, null],
    ],
  },
  {
    name: "Maison Andresy",
    orderInfo: null,
    contactInfo: "Code client: CLT005282",
    items: [
      ["AL13408", "Ketchup", null, 8, null, null],
      ["AL13407", "Mayonnaise", null, 9, null, null],
      ["AL13405", "Moutarde de Dijon", null, 3, null, null],
    ],
  },
];

async function upsertSupplier(data: SupplierData) {
  const items = data.items.map(([reference, designation, packaging, orderQuantity, unitPriceHT, casePriceHT]) => ({
    reference,
    designation,
    packaging,
    orderQuantity,
    unitPriceHT,
    casePriceHT,
  }));

  const existing = await prisma.supplier.findFirst({ where: { name: data.name } });
  if (existing) {
    await prisma.supplierItem.deleteMany({ where: { supplierId: existing.id } });
    await prisma.supplier.update({
      where: { id: existing.id },
      data: {
        orderInfo: data.orderInfo,
        contactInfo: data.contactInfo,
        items: { create: items },
      },
    });
  } else {
    await prisma.supplier.create({
      data: {
        name: data.name,
        orderInfo: data.orderInfo,
        contactInfo: data.contactInfo,
        items: { create: items },
      },
    });
  }
}

async function main() {
  let totalItems = 0;
  for (const supplier of suppliers) {
    await upsertSupplier(supplier);
    totalItems += supplier.items.length;
  }
  console.log(`Importé : ${suppliers.length} fournisseurs, ${totalItems} articles.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
