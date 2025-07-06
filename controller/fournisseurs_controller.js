const Fournisseurs = require("../models/fournisseurs_model")
exports.create = async (req, res) => {
    try {

        const nouveauFournisseur = new Fournisseurs({ ...req.body });

        const fournisseurSauvegarde = await nouveauFournisseur.save();

        return res.status(201).json({ message: "Ajouté", fournisseurs:fournisseurSauvegarde, });
    } catch (err) {
        return res.status(500).json({ message: "Erreur", error: err.message });
    }
};

exports.getFournisseurs = async (req, res) => {
    try {
        const { userId } = req.params

        if (!userId) {
            return res.status(400).json(
                { message: 'userId est requis' },
            );
        }

        const fournisseurs = await Fournisseurs.find({ userId }).sort({ nom: 1 });

        return res.status(200).json({ message: "OK", fournisseurs:fournisseurs });
    } catch (err) {
        return res.status(500).json({ message: "Erreur", error: err.message });
    }
};


exports.delete = async (req, res) => {
    try {
        const { id } = req.params;
        const fournisseur = await Fournisseurs.findByIdAndDelete(id);

        if (!fournisseur) {
            return res.status(404).json({ message: 'fournisseur non trouvé' });
        }

        return res.status(200).json({ message: 'Supprimé !!', fournisseurs: fournisseur });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

