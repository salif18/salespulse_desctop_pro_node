const Categories = require("../models/categories_model")

exports.create = async (req, res) => {
    try {

        // Créer une nouvelle dépense
        const nouvelleCategorie = new Categories({
            ...req.body
        });

        // Sauvegarder dans la base de données
        const results = await nouvelleCategorie.save();

        return res.status(201).json(
            { message: 'Ajouté !!', results:results },
        );
    } catch (err) {
        return res.status(500).json(
            { message: err.message },
        );
    }
}

exports.getCategories = async (req, res) => {
    try {

        const { userId } = req.params; // Extraire userId de l'URL

        if (!userId) {
            return res.status(400).json(
                { message: 'userId est requis' },
            );
        }

        // Récupérer les catégories selon le userId
        const results = await Categories.find({ userId }).sort({ name: 1 });

        return res.status(200).json(
            { message: 'ok', results:results },
        );

    } catch (err) {
        return res.status(500).json(
            { message: 'Une erreur s\'est produite', error: err.message },
        );
    }
}

exports.delete = async (req, res) => {
    try {
        const { id } = req.params;
        const categorie = await Categories.findByIdAndDelete(id);

        if (!categorie) {
            return res.status(404).json({ message: 'Categorie non trouvé' });
        }

        return res.status(200).json({ message: 'Supprimé !!', results: categorie });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};
