const Credits = require("../models/credits_model");

exports.create = async (req, res) => {
    try {

        const nouveauCredit = new Credits({ ...req.body });

        // Vérifie si recommandation est vide ou inexistante
        if (!nouveauCredit.recommandation || nouveauCredit.recommandation.length === 0) {
            nouveauCredit.recommandation = "Aucune";  // Affectation correcte
        }

        const creditSauvegarde = await nouveauCredit.save();

        return res.status(201).json({ message: "Ajouté", credits: creditSauvegarde, });
    } catch (err) {
        return res.status(500).json({ message: "Erreur", error: err.message });
    }
};

exports.getCredits = async (req, res) => {
    try {
        const { userId } = req.params

        if (!userId) {
            return res.status(400).json(
                { message: 'userId est requis' },
            );
        }

        const credits = await Credits.find({ userId }).sort({ nom: -1 });

        return res.status(200).json({ message: "OK", credits: credits });
    } catch (err) {
        return res.status(500).json({ message: "Erreur", error: err.message });
    }
};


exports.delete = async (req, res) => {
    try {
        const { id } = req.params;
        const credit = await Credits.findByIdAndDelete(id);

        if (!credit) {
            return res.status(404).json({ message: 'fournisseur non trouvé' });
        }

        return res.status(200).json({ message: 'Supprimé !!', credit: credit });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

