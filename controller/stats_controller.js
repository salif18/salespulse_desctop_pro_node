const Ventes = require("../models/ventes_model");
const Clients = require("../models/client_model");
const Produits = require("../models/produits_model");
const Mouvements = require("../models/mouvement_model");
const Depenses = require("../models/depenses_model");
const Reglements = require("../models/reglement_model")
const mongoose = require("mongoose");


exports.getStatistiquesGenerales = async (req, res) => {
  try {
    const { adminId } = req.auth; // On récupère adminId depuis le token

    if (!adminId) {
      return res.status(400).json({
        message: 'adminId est requis',
      });
    }
    const { mois } = req.query;

    const start = mois
      ? new Date(`${mois}-01`)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);

    // Récupération des données en parallèle
    const [ventes, mouvements, produits, clients, depenses, remboursements] = await Promise.all([
      Ventes.find({ adminId, createdAt: { $gte: start, $lt: end } }),
      Mouvements.find({
        adminId,
        createdAt: { $gte: start, $lt: end },
        $or: [{ type: 'retrait' }, { type: 'perte' }]
      }),
      Produits.find({ adminId }),
      Clients.find({ adminId }),
      Depenses.find({ adminId, createdAt: { $gte: start, $lt: end } }),
      Reglements.find({
        adminId,
        type: "remboursement",
        createdAt: { $gte: start, $lt: end }
      })
    ]);

    // Initialisation des variables
    let totalVentesBrutes = 0;
    let montantEncaisse = 0;
    let resteTotal = 0;
    let totalRemises = 0;
    let totalRemisesProduits = 0;
    let totalRemiseGlobale = 0;
    let totalTVACollectee = 0;


    // Coûts d'achat
    let coutAchatTotal = 0;
    let coutAchatVentes = 0;
    let coutAchatPertes = 0;
    let coutAchatStock = 0;
    let quantitePertes = 0;

    // Dans la boucle des ventes
    ventes.forEach(v => {
      totalVentesBrutes += v.total || 0;
      montantEncaisse += v.montant_recu || 0;
      resteTotal += v.reste || 0;

      // Calcul des remises globales
      if (v.remiseGlobale) {
        const remise = v.remiseGlobaleType === 'pourcent'
          ? (v.total * v.remiseGlobale / 100)
          : v.remiseGlobale;
        totalRemiseGlobale += remise;
      }

      // Calcul du coût d'achat pour TOUTES les ventes (doit toujours être fait)
      v.produits.forEach(p => {
        if (p.prix_achat && p.quantite) {
          const cout = p.prix_achat * p.quantite;
          coutAchatVentes += cout;
        }
      });

      // Calcul de la TVA
      if (v.tvaGlobale > 0) {
        // Calcul TVA globale
        let totalHT = v.produits.reduce((sum, p) => {
          const prixRemise = p.remise_type === 'pourcent'
            ? (p.prix_unitaire - (p.prix_unitaire * p.remise / 100))
            : (p.prix_unitaire - p.remise);
          return sum + (prixRemise * p.quantite);
        }, 0);

        // Appliquer la remise globale si elle existe
        if (v.remiseGlobale) {
          totalHT -= v.remiseGlobaleType === 'pourcent'
            ? (totalHT * v.remiseGlobale / 100)
            : v.remiseGlobale;
        }

        const montantTVA = (totalHT * v.tvaGlobale) / 100;
        totalTVACollectee += montantTVA;
      } else {
        // Calcul TVA par produit
        v.produits.forEach(p => {
          if (p.tva > 0) {
            const prixRemise = p.remise_type === 'pourcent'
              ? (p.prix_unitaire - (p.prix_unitaire * p.remise / 100))
              : (p.prix_unitaire - p.remise);

            const baseHT = prixRemise * p.quantite;
            const montantTVA = (baseHT * p.tva) / 100;
            totalTVACollectee += montantTVA;
          }
        });
      }

      // Calcul des remises produits (doit toujours être fait)
      v.produits.forEach(p => {
        if (p.remise) {
          const remise = p.remise_type === 'pourcent'
            ? (p.prix_unitaire * p.quantite * p.remise / 100)
            : (p.remise * p.quantite);
          totalRemisesProduits += remise;
        }
      });
    });

    // Somme totale des remises
    totalRemises = totalRemiseGlobale + totalRemisesProduits;

    // Calcul des pertes d'inventaire
    mouvements.forEach(mvt => {
      // Vérification plus robuste
      if (!mvt.productId || !mvt.quantite || mvt.quantite >= 0) return;

      const prixAchat = mvt.prix_achat; // récupéré directement du mouvement
      if (!prixAchat) return;

      const quantitePerdue = Math.abs(mvt.quantite);
      const cout = prixAchat * quantitePerdue;


      coutAchatPertes += cout;
      quantitePertes += quantitePerdue;
    });

    // Calcul du stock actuel
    produits.forEach(p => {
      if (p.prix_achat && p.stocks) {
        coutAchatStock += p.prix_achat * p.stocks;
      }
    });

    // Calculs finaux
    coutAchatTotal = coutAchatVentes + coutAchatPertes + coutAchatStock;

    // Bénéfice = (Ventes brutes - Remises) - Coût d'achat des ventes
    const benefice = (totalVentesBrutes - totalRemises) - coutAchatVentes;

    // Autres statistiques
    const nombreVentes = ventes.length;
    const nombreClients = clients.length;
    const produitsEnStock = produits.filter(p => p.stocks > 0).length;
    const totalPiecesEnStock = produits.reduce((total, p) => total + (p.stocks > 0 ? p.stocks : 0), 0);
    const produitsRupture = produits.filter(p => p.stocks === 0).length;
    const totalDepenses = depenses.reduce((acc, d) => acc + (d.montants || 0), 0);
    const montantRembourse = remboursements.reduce((acc, r) => acc + (r.montant || 0), 0);
    const etatCaisse = montantEncaisse - totalDepenses - montantRembourse;

     // Statistiques promos
    const margeMoyennePromo = await getMargeProduitsPromo(adminId);
    const nbPromoActifs = await getNbProduitsPromoActifs(adminId);

    // Pour impact, il faut la date promo (à adapter selon ta logique)
    // Exemple : date promo la plus récente
    const datePromoDebut = new Date(); // ou récupérer depuis un produit promo
    const impactPromoVentes = await getImpactPromoVentes(adminId, datePromoDebut);

    // Réponse finale
    return res.status(200).json({
      // Totaux financiers
      totalVentesBrutes: Number(totalVentesBrutes.toFixed(2)),
      montantEncaisse: Number(montantEncaisse.toFixed(2)),
      resteTotal: Number(resteTotal.toFixed(2)),

      // Détails des coûts
      coutAchatTotal: Number(coutAchatTotal.toFixed(2)),
      coutAchatVentes: Number(coutAchatVentes.toFixed(2)),
      coutAchatPertes: Number(coutAchatPertes.toFixed(2)),
      coutAchatStock: Number(coutAchatStock.toFixed(2)),
      quantitePertes,

      // Remises
      totalRemises: Number(totalRemises.toFixed(2)),
      totalRemisesProduits: Number(totalRemisesProduits.toFixed(2)),
      totalRemiseGlobale: Number(totalRemiseGlobale.toFixed(2)),
      totalTVACollectee: Number(totalTVACollectee.toFixed(2)),

      // Bénéfices
      benefice: Number(benefice.toFixed(2)),

      // Autres indicateurs
      totalDepenses: Number(totalDepenses.toFixed(2)),
      montantRembourse: Number(montantRembourse.toFixed(2)),
      etatCaisse: Number(etatCaisse.toFixed(2)),
      nombreVentes,
      nombreClients,
      produitsEnStock,
      totalPiecesEnStock,
      produitsRupture,

      margeMoyennePromo: Number(margeMoyennePromo.toFixed(2)),
      nbPromoActifs,
      impactPromoVentes
    });

  } catch (err) {
    console.error("Erreur stats:", err);
    return res.status(500).json({
      message: "Erreur lors du chargement des statistiques.",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// la marge
const getMargeProduitsPromo = async (adminId) => {
  const produitsPromo = await Produits.find({
    adminId,
    isPromo: true,
    prix_promo: { $gt: 0 }
  });

  let totalMarge = 0;
  let count = 0;

  produitsPromo.forEach(p => {
    if (p.prix_promo && p.prix_achat) {
      totalMarge += (p.prix_promo - p.prix_achat);
      count++;
    }
  });

  return count > 0 ? totalMarge / count : 0;
};


//impacte
// const getImpactPromoVentes = async (adminId, datePromoDebut) => {
//   const avant = await Ventes.aggregate([
//     { $match: {
//         adminId: new mongoose.Types.ObjectId(adminId),
//         createdAt: { $lt: datePromoDebut },
//         "produits.isPromo": false
//     }},
//     { $unwind: "$produits" },
//     { $match: { "produits.isPromo": false } },
//     { $group: {
//         _id: null,
//         totalQuantite: { $sum: "$produits.quantite" }
//     }}
//   ]);

//   const apres = await Ventes.aggregate([
//     { $match: {
//         adminId: new mongoose.Types.ObjectId(adminId),
//         createdAt: { $gte: datePromoDebut },
//         "produits.isPromo": false
//     }},
//     { $unwind: "$produits" },
//     { $match: { "produits.isPromo": false } },
//     { $group: {
//         _id: null,
//         totalQuantite: { $sum: "$produits.quantite" }
//     }}
//   ]);

//   return {
//     avant: avant[0]?.totalQuantite || 0,
//     apres: apres[0]?.totalQuantite || 0
//   };
// };

const getImpactPromoVentes = async (adminId, datePromoDebut) => {
  // 1. Ventes AVANT la promo (produits normaux uniquement)
  const avant = await Ventes.aggregate([
    { 
      $match: {
        adminId: new mongoose.Types.ObjectId(adminId),
        createdAt: { $lt: datePromoDebut },
        "produits.isPromo": false // Seulement produits non promo
      }
    },
    { $unwind: "$produits" },
    { $match: { "produits.isPromo": false } },
    { 
      $group: {
        _id: null,
        totalQuantite: { $sum: "$produits.quantite" },
        totalMontant: { $sum: { $multiply: ["$produits.prix", "$produits.quantite"] } }
      }
    }
  ]);

  // 2. Ventes APRES la promo (produits en promo uniquement)
  const apres = await Ventes.aggregate([
    { 
      $match: {
        adminId: new mongoose.Types.ObjectId(adminId),
        createdAt: { $gte: datePromoDebut },
        "produits.isPromo": true // Seulement produits en promo
      }
    },
    { $unwind: "$produits" },
    { $match: { "produits.isPromo": true } },
    { 
      $group: {
        _id: null,
        totalQuantite: { $sum: "$produits.quantite" },
        totalMontant: { $sum: { $multiply: ["$produits.prixPromo", "$produits.quantite"] } }
      }
    }
  ]);

  return {
    avant: {
      quantite: avant[0]?.totalQuantite || 0,
      montant: avant[0]?.totalMontant || 0
    },
    apres: {
      quantite: apres[0]?.totalQuantite || 0,
      montant: apres[0]?.totalMontant || 0
    },
    // Calcul de l'évolution en pourcentage
    evolution: {
      quantite: calculerEvolution(avant[0]?.totalQuantite, apres[0]?.totalQuantite),
      montant: calculerEvolution(avant[0]?.totalMontant, apres[0]?.totalMontant)
    }
  };
};

// Fonction helper pour calculer l'évolution en %
function calculerEvolution(avant = 0, apres = 0) {
  if (avant === 0) return apres > 0 ? 100 : 0;
  return ((apres - avant) / avant) * 100;
}


// nombre de produit en promo 
const getNbProduitsPromoActifs = async (adminId) => {
  return await Produits.countDocuments({
    adminId,
    isPromo: true,
  });
};


exports.getVentesDuJour = async (req, res) => {
  try {
    const { adminId } = req.auth; // On récupère adminId depuis le token

    if (!adminId) {
      return res.status(400).json({
        message: 'adminId est requis',
      });
    }

    const maintenant = new Date();
    const debutJour = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());
    const finJour = new Date(debutJour);
    finJour.setDate(finJour.getDate() + 1);

    const result = await Ventes.aggregate([
      {
        $match: {
          adminId: new mongoose.Types.ObjectId(adminId),
          createdAt: { $gte: debutJour, $lt: finJour }
        }
      },
      {
        $facet: {
          totalParHeure: [
            {
              $group: {
                _id: { $hour: "$createdAt" },
                total: { $sum: "$total" },
              }
            },
            { $sort: { _id: 1 } }
          ],
          quantiteParHeure: [
            { $unwind: "$produits" },
            {
              $group: {
                _id: { $hour: "$createdAt" },
                quantite: { $sum: "$produits.quantite" }
              }
            },
            { $sort: { _id: 1 } }
          ]
        }
      }
    ]);


    res.status(200).json(result);
  } catch (err) {
    console.error("Erreur dans getVentesDuJour:", err);
    res.status(500).json({ message: "Erreur lors de la récupération des ventes du jour." });
  }
};

exports.getVentesHebdomadaires = async (req, res) => {
  try {
    const { adminId } = req.auth; // On récupère adminId depuis le token

    if (!adminId) {
      return res.status(400).json({
        message: 'adminId est requis',
      });
    }

    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Dimanche, 1 = Lundi, ..., 6 = Samedi

    // Trouver le lundi de la semaine
    const diffToMonday = (dayOfWeek + 6) % 7; // décalage pour revenir au lundi
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0); // Lundi 00:00:00.000

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7); // Lundi suivant
    endOfWeek.setHours(0, 0, 0, 0); // Lundi suivant 00:00:00.000


    // Aggrégation MongoDB pour les ventes par jour de la semaine
    const ventesParJour = await Ventes.aggregate([
      {
        $match: {
          adminId: new mongoose.Types.ObjectId(adminId),
          createdAt: { $gte: startOfWeek, $lte: endOfWeek }
        }
      },
      {
        $group: {
          _id: { $dayOfWeek: "$createdAt" },
          total: { $sum: "$total" },
          quantity: { $sum: { $sum: "$produits.quantite" } }
        }
      },
      {
        $project: {
          day: "$_id",
          total: 1,
          quantity: 1,
          _id: 0
        }
      }
    ]);

    // Mapping explicite pour convertir MongoDB (1=Dim) -> Index (0=Lun ... 6=Dim)
    const mongoToIndex = {
      1: 6, // Dimanche => index 6
      2: 0, // Lundi => index 0
      3: 1, // Mardi
      4: 2, // Mercredi
      5: 3, // Jeudi
      6: 4, // Vendredi
      7: 5  // Samedi
    };

    const result = Array(7).fill(0).map((_, index) => {
      const found = ventesParJour.find(v => mongoToIndex[v.day] === index);
      return {
        day: index, // 0 = Lundi, ..., 6 = Dimanche
        total: found ? found.total : 0,
        quantity: found ? found.quantity : 0,
      };
    });


    res.status(200).json(result);
  } catch (err) {
    console.error("Erreur stats hebdo:", err);
    res.status(500).json({ message: "Erreur stats hebdomadaires" });
  }
};

exports.getVentesAnnee = async (req, res) => {
  try {
    const { adminId } = req.auth; // On récupère adminId depuis le token

    if (!adminId) {
      return res.status(400).json({
        message: 'adminId est requis',
      });
    }

    const anneeActuelle = new Date().getFullYear();

    const debutAnnee = new Date(anneeActuelle, 0, 1);
    const finAnnee = new Date(anneeActuelle + 1, 0, 1);

    const result = await Ventes.aggregate([
      {
        $match: {
          adminId: new mongoose.Types.ObjectId(adminId),
          createdAt: { $gte: debutAnnee, $lt: finAnnee }
        }
      },
      {
        $facet: {
          totalParMois: [
            {
              $group: {
                _id: { $month: "$createdAt" },
                total: { $sum: "$total" }
              }
            },
            { $sort: { _id: 1 } }
          ],
          quantiteParMois: [
            { $unwind: "$produits" },
            {
              $group: {
                _id: { $month: "$createdAt" },
                quantite: { $sum: "$produits.quantite" }
              }
            },
            { $sort: { _id: 1 } }
          ]
        }
      }
    ]);

    res.status(200).json(result);
  } catch (err) {
    console.error("Erreur dans getVentesAnnee:", err);
    res.status(500).json({ message: "Erreur lors des statistiques de l'année." });
  }
};


// Récupérer les ventes impayées ou partielles
exports.getClientsEnRetard = async (req, res) => {
  try {
    const { adminId } = req.auth; // On récupère adminId depuis le token

    if (!adminId) {
      return res.status(400).json({
        message: 'adminId est requis',
      });
    }
    const ventes = await Ventes.find({
      adminId,
      statut: { $in: ['crédit', 'partiel'] }
    }).populate('clientId');

    const data = ventes.map(v => ({
      venteId: v._id,
      clientId: v.clientId?._id,
      nomClient: v.nom,
      contact: v.contactClient,
      total: v.total,
      montantRecu: v.montant_recu,
      reste: v.reste,
      date: v.date,
    }));

    return res.status(200).json({ clients: data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur de récupération" });
  }
};


exports.getOperationsByUser = async (req, res) => {
  try {
    const { userId } = req.query;
    const periode = req.query.periode || 'jour';

    // Valider userId
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "userId invalide ou manquant" });
    }

    const { debut, fin } = calculerIntervalle(periode);

    const ventes = await Ventes.find({
      userId: new mongoose.Types.ObjectId(userId),
      createdAt: { $gte: debut, $lt: fin }
    });

    const reglements = await Reglements.find({
      userId: new mongoose.Types.ObjectId(userId),
      createdAt: { $gte: debut, $lt: fin }
    });

    const produitsVendus = ventes.flatMap(v => v.produits);

    const mouvements = await Mouvements.find({
      userId: new mongoose.Types.ObjectId(userId),
      createdAt: { $gte: debut, $lt: fin }
    }).populate("productId", "nom image prix_achat");


    const depenses = await Depenses.find({
      userId: new mongoose.Types.ObjectId(userId),
      createdAt: { $gte: debut, $lt: fin }
    });

    const stats = {
      totalVentes: ventes.length,
      montantTotal: ventes.reduce((sum, v) => sum + v.total, 0),
      montantRecu: ventes.reduce((sum, v) => sum + v.montant_recu, 0),
      totalDepenses: depenses.reduce((sum, d) => sum + d.montants, 0),
      totalProduits: produitsVendus.length,
    };

    res.json({ stats, ventes, produitsVendus, reglements, mouvements, depenses });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

function calculerIntervalle(periode) {
  const maintenant = new Date();
  let debut, fin;

  if (periode === 'jour') {
    debut = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());
    fin = new Date(debut);
    fin.setDate(fin.getDate() + 1);
  } else if (periode === 'semaine') {
    const jourSemaine = maintenant.getDay();
    const diff = jourSemaine === 0 ? 6 : jourSemaine - 1;
    debut = new Date(maintenant);
    debut.setDate(maintenant.getDate() - diff);
    debut.setHours(0, 0, 0, 0);
    fin = new Date(debut);
    fin.setDate(debut.getDate() + 7);
  } else if (periode === 'mois') {
    debut = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
    fin = new Date(maintenant.getFullYear(), maintenant.getMonth() + 1, 1);
  } else {
    debut = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());
    fin = new Date(debut);
    fin.setDate(fin.getDate() + 1);
  }

  return { debut, fin };
}