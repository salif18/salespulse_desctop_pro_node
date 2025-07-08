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
                    folder: "salespulse/images",
                    quality: 'auto:good',
                    width: 800,
                    height: 800,
                    crop: 'limit'
                }
            );
            imageUrl = result.secure_url;
            cloudinaryId = result.public_id;
        }

        // Création d'un nouvel objet produit
        const nouveauProduit = new Produits({
            ...req.body,
            image: req.file ? imageUrl : req.body.image,  // URL Cloudinary renvoyée dans req.file.path
            adminId: req.auth.adminId,// Associer le produit à l'utilisateur
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
    const { userId, stocks, type, description } = req.body; 
    const adminId = req.auth.adminId;

   

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
      adminId:adminId,
      userId,
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
        const { adminId } = req.auth; // On récupère adminId depuis le token

    if (!adminId) {
      return res.status(400).json({
        message: 'adminId est requis',
      });
    }

        const produits = await Produits.find({ adminId }).sort({ date_achat: -1 });
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

        // Validation des données requises
        const { nom, categories, description, prix_achat, prix_vente, stocks, seuil_alerte, unite, isPromo, prix_promo, date_achat, date_expiration } = req.body;

        // Trouver le produit existant
        const produit = await Produits.findById(id);
        if (!produit) {
            return res.status(404).json({ message: 'Produit non trouvé' });
        }

        // Vérification d'autorisation
        if (produit.adminId.toString() !== req.auth.adminId) {
            return res.status(403).json({ message: 'Non autorisé' });
        }

        // Validation des prix
        if (prix_achat && prix_vente && parseFloat(prix_vente) < parseFloat(prix_achat)) {
            return res.status(400).json({ message: 'Le prix de vente doit être supérieur au prix d\'achat' });
        }

        // Validation des dates
        if (date_achat && date_expiration && new Date(date_expiration) < new Date(date_achat)) {
            return res.status(400).json({ message: 'La date d\'expiration doit être après la date d\'achat' });
        }

        // Gestion de l'image
        let imageUrl = produit.image;
        let cloudinaryId = produit.cloudinaryId;
        
        if (req.file) {
            try {
                // Suppression de l'ancienne image si elle existe
                if (produit.cloudinaryId) {
                    await cloudinary.uploader.destroy(produit.cloudinaryId);
                }

                // Upload de la nouvelle image
                const result = await cloudinary.uploader.upload(req.file.path, {
                    folder:  "salespulse/images",
                    quality: 'auto:good',
                    width: 800,
                    height: 800,
                    crop: 'limit'
                });
                
                imageUrl = result.secure_url;
                cloudinaryId = result.public_id;
                
                // Suppression du fichier temporaire
                fs.unlinkSync(req.file.path);
            } catch (uploadError) {
                console.error('Erreur upload image:', uploadError);
                if (req.file?.path) fs.unlinkSync(req.file.path);
                return res.status(500).json({ message: 'Erreur lors du traitement de l\'image' });
            }
        }

        // Préparation des données de mise à jour
        const updateData = {
            nom: nom || produit.nom,
            image: imageUrl,
            cloudinaryId,
            categories: categories || produit.categories,
            description: description || produit.description,
            prix_achat: prix_achat || produit.prix_achat,
            prix_vente: prix_vente || produit.prix_vente,
            stocks: stocks || produit.stocks,
            seuil_alerte: seuil_alerte || produit.seuil_alerte,
            unite: unite || produit.unite,
            isPromo: isPromo !== undefined ? isPromo : produit.isPromo,
            prix_promo: isPromo ? (prix_promo || produit.prix_promo) : 0,
            date_achat: date_achat || produit.date_achat,
            date_expiration: date_expiration || produit.date_expiration,
            updatedAt: new Date()
        };

        // Mise à jour du produit
        const produitMisAJour = await Produits.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!produitMisAJour) {
            return res.status(400).json({ message: 'Erreur lors de la mise à jour du produit' });
        }

        console.log(produitMisAJour)
        return res.status(200).json({ 
            success: true,
            message: 'Produit modifié avec succès',
            data: produitMisAJour 
        });

    } catch (err) {
        console.error('Erreur modification produit:', err);
        return res.status(500).json({ 
            success: false,
            message: 'Erreur serveur',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

exports.delete = async (req, res) => {
    try { 

        const { id } = req.params
        const produit = await Produits.findByIdAndDelete(id);

        if (!produit) {
            return res.status(404).json({ message: 'Produit non trouvé' });
        }


        if (produit.adminId.toString() !== req.auth.adminId) {
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