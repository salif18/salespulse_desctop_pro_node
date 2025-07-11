const Abonnements = require("../models/abonnement_model");
const Paiements = require("../models/paiement_model");

// 🔒 Protéger avec middleware
exports.createAbonnements = async (req, res) => {
  const { type, montant, moyen_paiement } = req.body; // "essai" ou "premium"
  const { adminId } = req.auth;

  console.log(req.body)

  try {
    const maintenant = new Date();
    let dateFin;

    // Durée selon le type
    if (type === "essai") {
      dateFin = new Date(maintenant);
      dateFin.setDate(maintenant.getDate() + 7); // 7 jours
    } else if (type === "premium") {
      dateFin = new Date(maintenant);
      dateFin.setMonth(maintenant.getMonth() + 3); // 3 mois
    } else {
      return res.status(400).json({ error: "Type d'abonnement invalide" });
    }

    // Désactiver les anciens abonnements
    await Abonnements.updateMany(
      { adminId, statut: "actif" },
      { statut: "expiré" }
    );

    // Créer un nouveau
    const newAbonnement = new Abonnements({
      adminId,
      type,
      date_debut: maintenant,
      date_fin: dateFin,
      statut: "actif",
    });

    await newAbonnement.save();

    // Enregistrer le paiement après création d’abonnement
    await Paiements.create({
      adminId,
      montant,
      type,
      moyen_paiement: moyen_paiement, // ou "mobile", "carte", etc.
      statut: "réussi"
    });

    return res.status(201).json({
      message: `Abonnement ${type} activé avec succès`,
      abonnement: newAbonnement,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}



// historiques
exports.getHistoriqueAbonnements = async (req, res) => {
  try {
    const { adminId } = req.auth;

    const historiques = await Abonnements.find({ adminId })
      .sort({ createdAt: -1 });

    res.status(200).json({ historiques });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// verifier abonnement
exports.verifierAbonnement = async (req, res) => {
  const { adminId } = req.auth;

  try {
    const abonnement = await Abonnements.findOne({
      adminId,
      statut: "actif",
      date_fin: { $gte: new Date() }
    });

    if (!abonnement) {
      return res.status(403).json({
        error: "Votre abonnement est expiré ou inexistant. Veuillez le renouveler.",
      });
    }

    return res.status(200).json({
      message: "Abonnement actif",
      abonnement
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};



