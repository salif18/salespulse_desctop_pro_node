const Produits = require("../models/produits_model");
const Mouvements = require('../models/mouvement_model'); // adapte le chemin
const fs = require('fs');
const cloudinary = require("../middlewares/cloudinary")

exports.create = async (req, res, next) => {
    try {

        //valeur initial
        let imageUrl = "";
        let cloudinaryId = "";
        // Vérifier s'il y a un fichier
        if (req.file) {
            // Upload de l'image sur Cloudinary
            const result = await cloudinary.uploader.upload(req.file.path
                , {
                    folder: "salespulse/images"
                }
            );
            imageUrl = result.secure_url;
            cloudinaryId = result.public_id;
        }

        // Création d'un nouvel objet produit
        const nouveauProduit = new Produits({
            ...req.body,
            image: req.file ? imageUrl : req.body.image,  // URL Cloudinary renvoyée dans req.file.path
            userId: req.auth.userId,// Associer le produit à l'utilisateur
            cloudinaryId: cloudinaryId, // Enregistrer l'ID Cloudinary si nécessaire
        });
        // Sauvegarde du produit dans la base de données
        const produitSauvegarde = await nouveauProduit.save();

        // Retourner une réponse avec le produit sauvegardé
        return res.status(201).json({ message: "Ajouté", produits: produitSauvegarde });
    } catch (err) {

        return res.status(500).json({ message: "Erreur", error: err.message });
    }
};
exports.updateStock = async (req, res) => {
  try {
    const { stocks, type, description } = req.body; 
    const userId = req.auth.userId;

    console.log(req.body)

    if (stocks === undefined || stocks < 0) {
      return res.status(400).json({ message: "Stock invalide" });
    }

    const typesValides = ["ajout", "vente", "retrait", "perte", "modification"];
    if (!typesValides.includes(type)) {
      return res.status(400).json({ message: "Type de mouvement invalide" });
    }

    const produit = await Produits.findById(req.params.id);
    if (!produit) {
      return res.status(404).json({ message: "Produit introuvable" });
    }

    const ancienStock = produit.stocks;
    let nouveauStock = ancienStock;

    if (type === 'ajout') {
      nouveauStock = ancienStock + stocks;
    } else if (["vente", "retrait", "perte"].includes(type)) {
      if (stocks > ancienStock) {
        return res.status(400).json({ message: `Quantité ${type} supérieure au stock actuel` });
      }
      nouveauStock = ancienStock - stocks;
    } else if (type === 'modification') {
      nouveauStock = stocks; // Valeur fixée manuellement
    }

    produit.stocks = nouveauStock;
    await produit.save();

    const quantiteModifiee = nouveauStock - ancienStock;

    const nouveauMouvement = new Mouvements({
      productId: produit._id,
      userId:userId,
      type,
      quantite: quantiteModifiee,
      prix_achat:produit.prix_achat,
      ancien_stock: ancienStock,
      nouveau_stock: nouveauStock,
      date: new Date(),
      description: description || `Mouvement de type ${type} effectué`,
    });

    await nouveauMouvement.save();
   
    return res.status(200).json({
      message: "Stock mis à jour et mouvement enregistré",
      produit,
      mouvement: nouveauMouvement,
    });


  } catch (err) {
    return res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
};

exports.getProduits = async (req, res) => {
    try {
        const { userId } = req.params

        if (!userId) {
            return res.status(400).json(
                { message: 'userId est requis' },
            );
        }

        const produits = await Produits.find({ userId }).sort({ date_achat: -1 });
        const totalAchat = produits.map((x) => x.prix_achat * x.stocks).reduce((a, b) => a + b, 0);

        // Calcule le nombre total de stocks
        const stocks = produits.reduce((acc, item) => acc + (item?.stocks || 0), 0);

        return res.status(200).json({ message: "OK", produits: produits, totalAchatOfAchat: totalAchat, stocks });
    } catch (err) {
        return res.status(500).json({ message: "Erreur", error: err.message });
    }
};

exports.getOneProduits = async (req, res) => {
    try {
        const { id } = req.params

        const produit = await Produits.findById(id);

        if (!produit) {
            return res.status(404).json({ message: 'Produit non trouvé' });
        }

        return res.status(200).json({ message: 'ok', produits: produit });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ message: 'ID du produit manquant' });
        }

        const { nom, categories, prix_achat, prix_vente, stocks } = req.body;

        // Trouver le produit existant
        const produit = await Produits.findById(id);

        if (!produit) {
            return res.status(404).json({ message: 'Produit non trouvé' });
        }

        // Vérification d'autorisation
        if (produit.userId.toString() !== req.auth.userId) {
            return res.status(401).json({ message: 'Non autorisé' });
        }

        let imageUrl = produit.image; // Garder l'image actuelle si pas de mise à jour
        let cloudinaryId = produit.cloudinaryId; // Garder l'ancien Cloudinary ID si non modifié
        if (req.file) {
            // Si le produit a déjà une image associée, la supprimer sur Cloudinary
            if (produit.cloudinaryId) {
                await cloudinary.uploader.destroy(produit.cloudinaryId);
            }

            // Uploader la nouvelle image sur Cloudinary
            const result = await cloudinary.uploader.upload(req.file.path);
            imageUrl = result.secure_url; // URL sécurisée de la nouvelle image
            cloudinaryId = result.public_id; // ID Cloudinary de la nouvelle image
        }

        // Mise à jour du produit avec les nouvelles valeurs
        const produitMisAJour = await Produits.findByIdAndUpdate(
            id,
            {
                nom: nom ? nom : produit.nom,
                image: imageUrl, // URL Cloudinary renvoyée dans req.file.path
                cloudinaryId: cloudinaryId,
                categories: categories.length > 0 ? categories : produit.categories,
                prix_achat: prix_achat.length > 0 ? prix_achat : produit.prix_achat,
                prix_vente: prix_vente.length > 0 ? prix_vente : produit.prix_vente,
                stocks: stocks.length > 0 ? stocks : produit.stocks
            },
            { new: true } // retourne le document mis à jour
        );

        if (!produitMisAJour) {
            return res.status(400).json({ message: 'Erreur lors de la mise à jour du produit' });
        }

        return res.status(200).json({ message: 'Produit modifié avec succès', produits: produitMisAJour });

    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};


exports.delete = async (req, res) => {
    try {

        const { id } = req.params
        const produit = await Produits.findByIdAndDelete(id);

        if (!produit) {
            return res.status(404).json({ message: 'Produit non trouvé' });
        }


        if (produit.userId.toString() !== req.auth.userId) {
            return res.status(401).json({ message: 'Non autorisé' });
        }
        // Si le produit a un cloudinaryId, supprimer l'image sur Cloudinary
        if (produit.cloudinaryId) {
            await cloudinary.uploader.destroy(produit.cloudinaryId);
        }

        // Supprimer le produit
        await produit.deleteOne({ _id: id });
        // Si l'image est supprimée avec succès, supprimer le produit
        await produit.deleteOne({ _id: id });
        return res.status(200).json({ message: 'Produit et image supprimés avec succès' });



    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};