const Commandes = require("../models/commande_model");
const Produits = require("../models/produits_model");
const FactureSettings = require("../models/facture_settings_model")
const Mouvements = require('../models/mouvement_model'); // adapte le chemin

// POST /api/commandes
exports.create = async (req, res) => {
    try {
       
        console.log(req.body)

        const settings = await FactureSettings.findOne({ adminId });
            const prefix = settings?.facturePrefix || 'FAC';
           
            const compteur = String(ventesDuMois + 1).padStart(4, '0');
            const facture_number = `B${prefix}-${year}-${month}-${compteur}`;

        const nouvelleCommande = new Commandes({
          ...req.body,
          numeroCommande:facture_number
        });

        const savedCommande = await nouvelleCommande.save();
        res.status(201).json({
            message:"Commande enregistrer",
            savedCommande
    });

    } catch (error) {
        console.error("Erreur lors de la création de la commande :", error);
        res.status(500).json({ message: "Erreur serveur", error });
    }
};

exports.getCommandes = async (req, res) => {
    try {
        const { adminId } = req.auth
        // Validation de base

        if (!adminId) {
            return res.status(400).json({
                message: 'adminId est requis',
            });
        }

        const commandes = await Commandes.find({ adminId }).sort({ nom: 1 });

        return res.status(200).json({ message: "OK", commandes: commandes });
    } catch (error) {
        console.error("Erreur lors de la création de la commande :", error);
        res.status(500).json({ message: "Erreur serveur", error });
    }
};


// Valider une commande et mettre à jour les stocks
exports.validerCommande = async (req, res) => {
  try {
    console.log(req.params.id)
    const commandeId = req.params.id;

    const commande = await Commandes.findById(commandeId);
    if (!commande) {
      return res.status(404).json({ message: "Commande non trouvée." });
    }

    // Vérifie si déjà validée
    if (commande.statut === "reçue" || commande.statut === "validée") {
      return res.status(400).json({ message: "Commande déjà validée." });
    }

    // Mettre à jour les stocks
    for (let item of commande.produits) {
      const produit = await Produits.findById(item.productId);

      if (!produit) continue;
     const ancienStock = produit.stocks;
      // Ajoute la quantité commandée au stock existant
      produit.stocks += item.quantite;
      await produit.save();
      
     const nouveauMouvement = new Mouvements({
          productId: produit._id,
          adminId:adminId,
          userId:adminId,
          type:"ajout",
          quantite: item.quantite,
          prix_achat:item.prixAchat,
          ancien_stock: ancienStock,
          nouveau_stock: produit.stocks,
          date: new Date(),
          description: description || `Mouvement de type ajout effectué`,
        });
    
        await nouveauMouvement.save();

    }

    // Mettre à jour le statut de la commande
    commande.statut = "reçue";
    await commande.save();


    return res.status(200).json({ message: "Commande validée et stock mis à jour." });

  } catch (error) {
    console.error("Erreur validation commande:", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};


exports.delete = async (req, res) => {
    try {
        const { adminId } = req.auth
        if (!adminId) {
            return res.status(400).json({
                message: 'adminId est requis',
            });
        }

        const { id } = req.params;
        const commande = await Commandes.findByIdAndDelete(id);

        if (!commande) {
            return res.status(404).json({ message: 'commande non trouvé' });
        }
        return res.status(200).json({ message: 'Supprimé !!', commande: commande });

    } catch (error) {
        console.error("Erreur lors de la création de la commande :", error);
        res.status(500).json({ message: "Erreur serveur", error });
    }
};





