const Ventes = require("../models/ventes_model");
const Retours = require("../models/retours_model"); // Import retours
const Produits = require("../models/produits_model");
const Clients = require("../models/client_model");
const Mouvements = require("../models/mouvement_model");
const Depenses = require("../models/depenses_model");
const Reglements = require("../models/reglement_model");
const mongoose = require("mongoose");

exports.getStatistiquesGenerales = async (req, res) => {
  try {
    const { adminId } = req.auth;
    if (!adminId) {
      return res.status(400).json({ message: 'adminId est requis' });
    }

    const { mois } = req.query;
    const start = mois ? new Date(`${mois}-01`) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);

    // Récupération des données en parallèle
    const [
      ventes,
      retours,
      mouvements,
      produits,
      clients,
      depenses,
      remboursements,
      statsPromo
    ] = await Promise.all([
      Ventes.find({ adminId, createdAt: { $gte: start, $lt: end } }).lean(),
      Retours.find({ adminId, createdAt: { $gte: start, $lt: end } }).lean(),
      Mouvements.find({
        adminId,
        createdAt: { $gte: start, $lt: end },
        $or: [{ type: 'retrait' }, { type: 'perte' }]
      }).lean(),
      Produits.find({ adminId }).select('prix_achat stocks').lean(),
      Clients.countDocuments({ adminId }),
      Depenses.find({ adminId, createdAt: { $gte: start, $lt: end } }).lean(),
      Reglements.find({
        adminId,
        type: "remboursement",
        createdAt: { $gte: start, $lt: end }
      }).lean(),
      // Stats promo as before
      (async () => {
        const margeMoyennePromo = await getMargeProduitsPromo(adminId);
        const nbPromoActifs = await getNbProduitsPromoActifs(adminId);
        const datePromoDebut = await getDateDernierePromo(adminId);
        const impactPromoVentes = await getImpactPromoVentes(adminId, datePromoDebut);
        return { margeMoyennePromo, nbPromoActifs, impactPromoVentes };
      })()
    ]);

    // Calculs sur les ventes
    let {
      totalVentesBrutes,
      montantEncaisse,
      resteTotal,
      totalRemisesProduits,
      totalRemiseGlobale,
      totalTVACollectee,
      coutAchatVentes
    } = ventes.reduce((acc, v) => {
      acc.totalVentesBrutes += v.total || 0;
      acc.montantEncaisse += v.montant_recu || 0;
      acc.resteTotal += v.reste || 0;

      if (v.remiseGlobale) {
        const remise = v.remiseGlobaleType === 'pourcent'
          ? (v.total * v.remiseGlobale / 100)
          : v.remiseGlobale;
        acc.totalRemiseGlobale += remise;
      }

      v.produits.forEach(p => {
        if (p.prix_achat && p.quantite) {
          acc.coutAchatVentes += p.prix_achat * p.quantite;
        }

        if (p.remise) {
          const remise = p.remise_type === 'pourcent'
            ? (p.prix_unitaire * p.quantite * p.remise / 100)
            : (p.remise * p.quantite);
          acc.totalRemisesProduits += remise;
        }

        if (v.tvaGlobale > 0 || p.tva > 0) {
          const prixRemise = p.remise_type === 'pourcent'
            ? (p.prix_unitaire - (p.prix_unitaire * p.remise / 100))
            : (p.prix_unitaire - p.remise);

          const baseHT = prixRemise * p.quantite;
          const tauxTVA = v.tvaGlobale > 0 ? v.tvaGlobale : p.tva;
          acc.totalTVACollectee += (baseHT * tauxTVA) / 100;
        }
      });

      return acc;
    }, {
      totalVentesBrutes: 0,
      montantEncaisse: 0,
      resteTotal: 0,
      totalRemisesProduits: 0,
      totalRemiseGlobale: 0,
      totalTVACollectee: 0,
      coutAchatVentes: 0
    });

    const totalRemises = totalRemiseGlobale + totalRemisesProduits;

    // Calcul des pertes
    const { coutAchatPertes, quantitePertes } = mouvements.reduce((acc, mvt) => {
      if (mvt.productId && mvt.quantite < 0 && mvt.prix_achat) {
        const quantitePerdue = Math.abs(mvt.quantite);
        acc.coutAchatPertes += mvt.prix_achat * quantitePerdue;
        acc.quantitePertes += quantitePerdue;
      }
      return acc;
    }, { coutAchatPertes: 0, quantitePertes: 0 });

    // Calcul du stock
    const coutAchatStock = produits.reduce((acc, p) =>
      p.prix_achat && p.stocks ? acc + (p.prix_achat * p.stocks) : acc, 0);

    // **Calcul des retours**
    const totalRetours = retours.reduce((acc, r) => {
      const montantRetour = r.produits.reduce((sum, p) => sum + ((p.prixVente || 0) * p.quantite), 0);
      return acc + montantRetour;
    }, 0);

    // Calcul bénéfice ajusté (on enlève totalRetours du CA)
    const benefice = (totalVentesBrutes - totalRemises - totalRetours) - coutAchatVentes;

    const coutAchatTotal = coutAchatVentes + coutAchatPertes + coutAchatStock;

    // Autres stats
    const totalDepenses = depenses.reduce((acc, d) => acc + (d.montants || 0), 0);
    const montantRembourse = remboursements.reduce((acc, r) => acc + (r.montant || 0), 0);
    const etatCaisse = montantEncaisse - totalDepenses - montantRembourse;

    const produitsEnStock = produits.filter(p => p.stocks > 0).length;
    const totalPiecesEnStock = produits.reduce((acc, p) => acc + (p.stocks > 0 ? p.stocks : 0), 0);
    const produitsRupture = produits.filter(p => p.stocks === 0).length;

    // Réponse finale
    return res.status(200).json({
      totalVentesBrutes: Number(totalVentesBrutes.toFixed(2)),
      totalRetours: Number(totalRetours.toFixed(2)),             // ajouté
      montantEncaisse: Number(montantEncaisse.toFixed(2)),
      resteTotal: Number(resteTotal.toFixed(2)),

      coutAchatTotal: Number(coutAchatTotal.toFixed(2)),
      coutAchatVentes: Number(coutAchatVentes.toFixed(2)),
      coutAchatPertes: Number(coutAchatPertes.toFixed(2)),
      coutAchatStock: Number(coutAchatStock.toFixed(2)),
      quantitePertes,

      totalRemises: Number(totalRemises.toFixed(2)),
      totalRemisesProduits: Number(totalRemisesProduits.toFixed(2)),
      totalRemiseGlobale: Number(totalRemiseGlobale.toFixed(2)),
      totalTVACollectee: Number(totalTVACollectee.toFixed(2)),

      benefice: Number(benefice.toFixed(2)),

      totalDepenses: Number(totalDepenses.toFixed(2)),
      montantRembourse: Number(montantRembourse.toFixed(2)),
      etatCaisse: Number(etatCaisse.toFixed(2)),
      nombreVentes: ventes.length,
      nombreClients: clients,
      produitsEnStock,
      totalPiecesEnStock,
      produitsRupture,

      margeMoyennePromo: Number(statsPromo.margeMoyennePromo.toFixed(2)),
      nbPromoActifs: statsPromo.nbPromoActifs,
      impactPromoVentes: statsPromo.impactPromoVentes
    });

  } catch (err) {
    console.error("Erreur stats:", err);
    return res.status(500).json({
      message: "Erreur lors du chargement des statistiques.",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// N'oublie pas d'avoir aussi les fonctions getMargeProduitsPromo, getNbProduitsPromoActifs, getDateDernierePromo, getImpactPromoVentes,
// comme dans ton code original, elles ne changent pas.


// exports.getStatistiquesGenerales = async (req, res) => {
//   try {
//     const { adminId } = req.auth;
//     if (!adminId) {
//       return res.status(400).json({ message: 'adminId est requis' });
//     }

//     const { mois } = req.query;
//     const start = mois ? new Date(`${mois}-01`) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
//     const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);

//     // Récupération des données en parallèle avec optimisations
//     const [
//       ventes, 
//       mouvements, 
//       produits, 
//       clients, 
//       depenses, 
//       remboursements,
//       statsPromo
//     ] = await Promise.all([
//       Ventes.find({ adminId, createdAt: { $gte: start, $lt: end } }).lean(),
//       Mouvements.find({
//         adminId,
//         createdAt: { $gte: start, $lt: end },
//         $or: [{ type: 'retrait' }, { type: 'perte' }]
//       }).lean(),
//       Produits.find({ adminId }).select('prix_achat stocks').lean(),
//       Clients.countDocuments({ adminId }),
//       Depenses.find({ adminId, createdAt: { $gte: start, $lt: end } }).lean(),
//       Reglements.find({
//         adminId,
//         type: "remboursement",
//         createdAt: { $gte: start, $lt: end }
//       }).lean(),
//       // Récupération des stats promo en parallèle
//       (async () => {
//         const margeMoyennePromo = await getMargeProduitsPromo(adminId);
//         const nbPromoActifs = await getNbProduitsPromoActifs(adminId);
//         const datePromoDebut = await getDateDernierePromo(adminId);
//         const impactPromoVentes = await getImpactPromoVentes(adminId, datePromoDebut);
//         return { margeMoyennePromo, nbPromoActifs, impactPromoVentes };
//       })()
//     ]);

//     // Calculs optimisés
//     let {
//       totalVentesBrutes,
//       montantEncaisse,
//       resteTotal,
//       totalRemises,
//       totalRemisesProduits,
//       totalRemiseGlobale,
//       totalTVACollectee,
//       coutAchatVentes
//     } = ventes.reduce((acc, v) => {
//       acc.totalVentesBrutes += v.total || 0;
//       acc.montantEncaisse += v.montant_recu || 0;
//       acc.resteTotal += v.reste || 0;

//       if (v.remiseGlobale) {
//         const remise = v.remiseGlobaleType === 'pourcent'
//           ? (v.total * v.remiseGlobale / 100)
//           : v.remiseGlobale;
//         acc.totalRemiseGlobale += remise;
//       }

//       v.produits.forEach(p => {
//         if (p.prix_achat && p.quantite) {
//           acc.coutAchatVentes += p.prix_achat * p.quantite;
//         }

//         if (p.remise) {
//           const remise = p.remise_type === 'pourcent'
//             ? (p.prix_unitaire * p.quantite * p.remise / 100)
//             : (p.remise * p.quantite);
//           acc.totalRemisesProduits += remise;
//         }

//         // Calcul TVA
//         if (v.tvaGlobale > 0 || p.tva > 0) {
//           const prixRemise = p.remise_type === 'pourcent'
//             ? (p.prix_unitaire - (p.prix_unitaire * p.remise / 100))
//             : (p.prix_unitaire - p.remise);
          
//           const baseHT = prixRemise * p.quantite;
//           const tauxTVA = v.tvaGlobale > 0 ? v.tvaGlobale : p.tva;
//           acc.totalTVACollectee += (baseHT * tauxTVA) / 100;
//         }
//       });

//       return acc;
//     }, {
//       totalVentesBrutes: 0,
//       montantEncaisse: 0,
//       resteTotal: 0,
//       totalRemises: 0,
//       totalRemisesProduits: 0,
//       totalRemiseGlobale: 0,
//       totalTVACollectee: 0,
//       coutAchatVentes: 0
//     });

//     totalRemises = totalRemiseGlobale + totalRemisesProduits;

//     // Calcul des pertes
//     const { coutAchatPertes, quantitePertes } = mouvements.reduce((acc, mvt) => {
//       if (mvt.productId && mvt.quantite < 0 && mvt.prix_achat) {
//         const quantitePerdue = Math.abs(mvt.quantite);
//         acc.coutAchatPertes += mvt.prix_achat * quantitePerdue;
//         acc.quantitePertes += quantitePerdue;
//       }
//       return acc;
//     }, { coutAchatPertes: 0, quantitePertes: 0 });

//     // Calcul du stock
//     const coutAchatStock = produits.reduce((acc, p) => 
//       p.prix_achat && p.stocks ? acc + (p.prix_achat * p.stocks) : acc, 0);

//     const coutAchatTotal = coutAchatVentes + coutAchatPertes + coutAchatStock;
//     const benefice = (totalVentesBrutes - totalRemises) - coutAchatVentes;

//     // Autres stats
//     const totalDepenses = depenses.reduce((acc, d) => acc + (d.montants || 0), 0);
//     const montantRembourse = remboursements.reduce((acc, r) => acc + (r.montant || 0), 0);
//     const etatCaisse = montantEncaisse - totalDepenses - montantRembourse;

//     const produitsEnStock = produits.filter(p => p.stocks > 0).length;
//     const totalPiecesEnStock = produits.reduce((acc, p) => acc + (p.stocks > 0 ? p.stocks : 0), 0);
//     const produitsRupture = produits.filter(p => p.stocks === 0).length;

//     // Réponse finale
//     return res.status(200).json({
//       // Totaux financiers
//       totalVentesBrutes: Number(totalVentesBrutes.toFixed(2)),
//       montantEncaisse: Number(montantEncaisse.toFixed(2)),
//       resteTotal: Number(resteTotal.toFixed(2)),

//       // Détails des coûts
//       coutAchatTotal: Number(coutAchatTotal.toFixed(2)),
//       coutAchatVentes: Number(coutAchatVentes.toFixed(2)),
//       coutAchatPertes: Number(coutAchatPertes.toFixed(2)),
//       coutAchatStock: Number(coutAchatStock.toFixed(2)),
//       quantitePertes,

//       // Remises
//       totalRemises: Number(totalRemises.toFixed(2)),
//       totalRemisesProduits: Number(totalRemisesProduits.toFixed(2)),
//       totalRemiseGlobale: Number(totalRemiseGlobale.toFixed(2)),
//       totalTVACollectee: Number(totalTVACollectee.toFixed(2)),

//       // Bénéfices
//       benefice: Number(benefice.toFixed(2)),

//       // Autres indicateurs
//       totalDepenses: Number(totalDepenses.toFixed(2)),
//       montantRembourse: Number(montantRembourse.toFixed(2)),
//       etatCaisse: Number(etatCaisse.toFixed(2)),
//       nombreVentes: ventes.length,
//       nombreClients: clients,
//       produitsEnStock,
//       totalPiecesEnStock,
//       produitsRupture,

//       // Stats promos
//       margeMoyennePromo: Number(statsPromo.margeMoyennePromo.toFixed(2)),
//       nbPromoActifs: statsPromo.nbPromoActifs,
//       impactPromoVentes: statsPromo.impactPromoVentes
//     });

//   } catch (err) {
//     console.error("Erreur stats:", err);
//     return res.status(500).json({
//       message: "Erreur lors du chargement des statistiques.",
//       error: process.env.NODE_ENV === 'development' ? err.message : undefined
//     });
//   }
// };

// Helper function pour récupérer la date de la dernière promo
const getDateDernierePromo = async (adminId) => {
  try {
    // Trouver le produit avec la date de promo la plus récente
    const dernierProduitPromo = await Produits.findOne({ 
      adminId, 
      isPromo: true,
      date_debut_promo: { $exists: true, $lte: new Date() }, // Promos déjà commencées
      date_fin_promo: { $gte: new Date() } // Promos encore actives
    }).sort({ date_debut_promo: -1 }); // Tri par date décroissante

    // Si pas de promo active, prendre la dernière promo terminée
    if (!dernierProduitPromo) {
      const dernierePromoPassee = await Produits.findOne({
        adminId,
        isPromo: true,
        date_debut_promo: { $exists: true }
      }).sort({ date_debut_promo: -1 });
      
      return dernierePromoPassee?.date_debut_promo || new Date();
    }

    return dernierProduitPromo.date_debut_promo;
  } catch (error) {
    console.error("Erreur dans getDateDernierePromo:", error);
    return new Date(); // Fallback
  }
};
// Version optimisée de getMargeProduitsPromo
const getMargeProduitsPromo = async (adminId) => {
  try {
    const result = await Produits.aggregate([
      { 
        $match: { 
          adminId: new mongoose.Types.ObjectId(adminId),
          isPromo: true,
          prix_promo: { $gt: 0 },
          prix_achat: { $gt: 0 }
        }
      },
      {
        $project: {
          marge: { $subtract: ["$prix_promo", "$prix_achat"] }
        }
      },
      {
        $group: {
          _id: null,
          moyenne: { $avg: "$marge" },
          total: { $sum: "$marge" },
          count: { $sum: 1 }
        }
      }
    ]);

    return result[0]?.moyenne || 0;
  } catch (error) {
    console.error("Erreur dans getMargeProduitsPromo:", error);
    return 0;
  }
};

const getImpactPromoVentes = async (adminId, datePromoDebut) => {
  try {
    // 1. Trouver tous les produits qui ont été en promo pendant cette période
    const produitsPromoIds = await Produits.find({
      adminId,
      isPromo: true,
      $or: [
        { 
          date_debut_promo: { $lte: datePromoDebut },
          date_fin_promo: { $gte: datePromoDebut }
        },
        { 
          date_debut_promo: { $gte: datePromoDebut }
        }
      ]
    }).distinct('_id');

    // 2. Requêtes parallélisées
    const [avant, apres] = await Promise.all([
      // Ventes AVANT promo
      Ventes.aggregate([
        { 
          $match: {
            adminId: new mongoose.Types.ObjectId(adminId),
            createdAt: { $lt: datePromoDebut },
            "produits.isPromo": false
          }
        },
        { $unwind: "$produits" },
        { $match: { "produits.isPromo": false } },
        { $group: { _id: null, totalQuantite: { $sum: "$produits.quantite" } } }
      ]),
      
      // Ventes APRES promo
      Ventes.aggregate([
        { 
          $match: {
            adminId: new mongoose.Types.ObjectId(adminId),
            createdAt: { $gte: datePromoDebut },
            "produits.productId": { $in: produitsPromoIds }
          }
        },
        { $unwind: "$produits" },
        { $match: { "produits.productId": { $in: produitsPromoIds } } },
        { $group: { _id: null, totalQuantite: { $sum: "$produits.quantite" } } }
      ])
    ]);

    console.log("Résultats:", {
      avant: avant[0]?.totalQuantite || 0,
      apres: apres[0]?.totalQuantite || 0,
      produitsPromoIds
    });

    return {
      avant: { quantite: avant[0]?.totalQuantite || 0 },
      apres: { quantite: apres[0]?.totalQuantite || 0 }
    };
  } catch (error) {
    console.error("Erreur dans getImpactPromoVentes:", error);
    return { avant: { quantite: 0 }, apres: { quantite: 0 } };
  }
};
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