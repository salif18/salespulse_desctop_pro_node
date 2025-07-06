const Reglements = require("../models/reglement_model")
const Ventes = require("../models/ventes_model")

exports.create = async (req, res) => {
  try {
    const { montant, type, venteId } = req.body;

    // Vérification
    const vente = await Ventes.findById(venteId);
    if (!vente) {
      return res.status(404).json({ message: "Vente introuvable" });
    }

    const montantReglement = Number(montant) || 0;

    if (type === "règlement") {
      // ➕ Ajouter au montant encaissé
      vente.montant_recu = Number(vente.montant_recu || 0) + montantReglement;

      // ➖ Réduire le reste à payer
      vente.reste = Number(vente.reste || 0) - montantReglement;
      if (vente.reste < 0) vente.reste = 0;

      // ✅ Mettre à jour le statut
      vente.statut = vente.reste === 0 ? "payée" : "crédit";

    } else if (type === "remboursement") {
      // ➖ Réduction de la monnaie
      vente.monnaie = Number(vente.monnaie || 0) - montantReglement;
      if (vente.monnaie < 0) vente.monnaie = 0;

      // ✅ Statut
      vente.statut = vente.monnaie === 0 ? "payée" : "crédit";

    } else {
      return res.status(400).json({ message: "Type de règlement invalide" });
    }

    // 💾 Enregistrer le règlement
    const nouveauReglement = new Reglements({ ...req.body, nom: vente.nom });
    const reglementSauvegarde = await nouveauReglement.save();

    // 💾 Mettre à jour la vente
    await vente.save();

    return res.status(201).json({
      message: "✅ Règlement effectué avec succès",
      reglement: reglementSauvegarde,
      vente,
    });

  } catch (err) {
    console.log("❌ Erreur serveur :", err);
    return res.status(500).json({
      message: "Erreur serveur lors du règlement",
      error: err.message,
    });
  }
};

exports.getReglements = async (req, res) => {
    try {
        const { userId } = req.params

        if (!userId) {
            return res.status(400).json(
                { message: 'userId est requis' },
            );
        }

        const reglements = await Reglements.find({ userId }).sort({ date: -1 });

        return res.status(200).json({ message: "OK", reglements: reglements });
    } catch (err) {
        return res.status(500).json({ message: "Erreur", error: err.message });
    }
};


exports.delete = async (req, res) => {
    try {
        const { id } = req.params;
        const reglement = await Reglements.findByIdAndDelete(id);

        if (!reglement) {
            return res.status(404).json({ message: 'reglement non trouvé' });
        }

        return res.status(200).json({ message: 'Supprimé !!', reglement: reglement });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

