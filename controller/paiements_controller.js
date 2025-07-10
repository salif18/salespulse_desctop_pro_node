const Paiements = require("../models/paiement_model");

// 🔽 Enregistrer un paiement
exports.createPaiement = async (req, res) => {
  const { montant, type, moyen_paiement } = req.body;
  const { adminId } = req.auth;

  try {
    const paiement = new Paiements({
      adminId,
      montant,
      type,
      moyen_paiement,
      statut: "réussi"
    });

    await paiement.save();

    return res.status(201).json({
      message: "Paiement enregistré avec succès",
      paiement
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// 🔽 Obtenir les paiements de l’utilisateur connecté
exports.getMesPaiements = async (req, res) => {
  const { adminId } = req.auth;

  try {
    const paiements = await Paiements.find({ adminId }).sort({ createdAt: -1 });
    return res.status(200).json({ paiements });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// 🔽 Obtenir tous les paiements (admin système)
exports.getAllPaiements = async (req, res) => {
  const { role } = req.auth;

  if (role !== "admin") {
    return res.status(403).json({ error: "Accès refusé" });
  }

  try {
    const paiements = await Paiement.find()
      .populate("adminId", "name email numero")
      .sort({ createdAt: -1 });

    return res.status(200).json({ paiements });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
