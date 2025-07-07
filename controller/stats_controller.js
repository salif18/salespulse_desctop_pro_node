const Ventes = require("../models/ventes_model");
const Clients = require("../models/client_model");
const Produits = require("../models/produits_model");
const Mouvements = require("../models/mouvement_model");
const Depenses = require("../models/depenses_model");
const Reglements = require("../models/reglement_model")
const mongoose = require("mongoose");

exports.getStatistiquesGenerales = async (req, res) => {
  try {
    const { userId } = req.params;
    const { mois } = req.query;

    const start = mois
      ? new Date(`${mois}-01`)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);

    // Récupération des données en parallèle
    const [ventes, mouvements, produits, clients, depenses, remboursements] = await Promise.all([
      Ventes.find({ userId, createdAt: { $gte: start, $lt: end } }),
      Mouvements.find({
        userId,
        createdAt: { $gte: start, $lt: end },
        $or: [{ type: 'retrait' }, { type: 'perte' }]
      }),
      Produits.find({ userId }),
      Clients.find({ userId }),
      Depenses.find({ userId, createdAt: { $gte: start, $lt: end } }),
      Reglements.find({
        userId,
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

    // Coûts d'achat
    let coutAchatTotal = 0;
    let coutAchatVentes = 0;
    let coutAchatPertes = 0;
    let coutAchatStock = 0;
    let quantitePertes = 0;

    // Calcul des ventes et remises
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

      // Calcul par produit
      v.produits.forEach(p => {
        // Coût d'achat
        if (p.prix_achat && p.quantite) {
          const cout = p.prix_achat * p.quantite;
          coutAchatVentes += cout;
        }

        // Remises produits
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
    const produitsMap = new Map(produits.map(p => [p._id.toString(), p]));

    mouvements.forEach(mvt => {
      // Vérification plus robuste
      if (!mvt.productId || !mvt.quantite || mvt.quantite >= 0) return;

      // const produit = produitsMap.get(mvt.productId.toString()); // .toString() pour sécurité
      // if (!produit || !produit.prix_achat) return;

      // const quantitePerdue = Math.abs(mvt.quantite);
      // const cout = produit.prix_achat * quantitePerdue;

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
    const produitsRupture = produits.filter(p => p.stocks === 0).length;
    const totalDepenses = depenses.reduce((acc, d) => acc + (d.montants || 0), 0);
    const montantRembourse = remboursements.reduce((acc, r) => acc + (r.montant || 0), 0);
    const etatCaisse = montantEncaisse - totalDepenses - montantRembourse;

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

      // Bénéfices
      benefice: Number(benefice.toFixed(2)),

      // Autres indicateurs
      totalDepenses: Number(totalDepenses.toFixed(2)),
      montantRembourse: Number(montantRembourse.toFixed(2)),
      etatCaisse: Number(etatCaisse.toFixed(2)),
      nombreVentes,
      nombreClients,
      produitsEnStock,
      produitsRupture
    });

  } catch (err) {
    console.error("Erreur stats:", err);
    return res.status(500).json({
      message: "Erreur lors du chargement des statistiques.",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

exports.getVentesDuJour = async (req, res) => {
  try {
    const { userId } = req.params;

    const maintenant = new Date();
    const debutJour = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());
    const finJour = new Date(debutJour);
    finJour.setDate(finJour.getDate() + 1);

    const result = await Ventes.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          createdAt: { $gte: debutJour, $lt: finJour }
        }
      },
      {
        $unwind: "$produits"
      },
      {
        $group: {
          _id: { $hour: "$createdAt" },
          total: { $sum: "$total" },
          quantite: { $sum: "$produits.quantite" }
        }
      },
      {
        $sort: { _id: 1 }
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
    const { userId } = req.params;

    // Calcul des dates pour la semaine en cours
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)));
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    // Aggrégation MongoDB pour les ventes par jour de la semaine
    const ventesParJour = await Ventes.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
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

    // Formatage des résultats pour avoir tous les jours (même ceux sans ventes)
    // const joursSemaine = [1, 2, 3, 4, 5, 6, 7]; // Lundi à dimanche en MongoDB
    // const result = joursSemaine.map(day => {
    //   const found = ventesParJour.find(v => v.day === day) || { day, total: 0, quantity: 0 };
    //   return {
    //     day: day - 1, // Conversion pour 0-6 (Lun-Dim)
    //     total: found.total,
    //     quantity: found.quantity
    //   };
    // });

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
    const { userId } = req.params;

    const anneeActuelle = new Date().getFullYear();

    const debutAnnee = new Date(anneeActuelle, 0, 1);
    const finAnnee = new Date(anneeActuelle + 1, 0, 1);

    const result = await Ventes.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          createdAt: { $gte: debutAnnee, $lt: finAnnee }
        }
      },
      { $unwind: "$produits" },
      {
        $group: {
          _id: { $month: "$createdAt" },
          total: { $sum: "$total" },
          quantite: { $sum: "$produits.quantite" }
        }
      },
      { $sort: { _id: 1 } }
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
    const { userId } = req.params;

    const ventes = await Ventes.find({
      userId,
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


