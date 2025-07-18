const Commandes = require("../models/commande_model");
const Produits = require("../models/produits_model");
const FactureSettings = require("../models/facture_settings_model")
const Mouvements = require('../models/mouvement_model'); // adapte le chemin

// POST /api/commandes
exports.create = async (req, res) => {
    try {
        const { adminId } = req.auth

        console.log(req.body)

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');

        // Début et fin du mois pour filtrer
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        // Compter les commandes du mois
        const commandesDuMois = await Commandes.countDocuments({
            adminId,
            date: { $gte: startOfMonth, $lte: endOfMonth }
        });
      
        
        const settings = await FactureSettings.findOne({ adminId });
        const prefix = settings?.facturePrefix || 'FAC';
        const compteur = String(commandesDuMois + 1).padStart(4, '0');
        const facture_number = `BN-${prefix}${year}${month}-${compteur}`;

        const nouvelleCommande = new Commandes({
            ...req.body,
            numeroCommande:facture_number
        });

        const savedCommande = await nouvelleCommande.save();
        res.status(201).json({
            message: "Commande enregistrer",
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
// exports.validerCommande = async (req, res) => {
//     try {
//         console.log(req.params.id)
//         const commandeId = req.params.id;

//         const commande = await Commandes.findById(commandeId);
//         if (!commande) {
//             return res.status(404).json({ message: "Commande non trouvée." });
//         }

//         // Vérifie si déjà validée
//         if (commande.statut === "reçue" || commande.statut === "validée") {
//             return res.status(400).json({ message: "Commande déjà validée." });
//         }

//         // Mettre à jour les stocks
//         for (let item of commande.produits) {
//             const produit = await Produits.findById(item.productId);

//             if (!produit) continue;
//             const ancienStock = produit.stocks;
//             // Ajoute la quantité commandée au stock existant
//             produit.stocks += item.quantite;
//             await produit.save();

//             const nouveauMouvement = new Mouvements({
//                 productId: produit._id,
//                 adminId: adminId,
//                 userId: adminId,
//                 type: "ajout",
//                 quantite: item.quantite,
//                 prix_achat: item.prixAchat,
//                 ancien_stock: ancienStock,
//                 nouveau_stock: produit.stocks,
//                 date: new Date(),
//                 description: `Commande ${commande.numero} validée – produits ajoutés au stock.`
//             });

//             await nouveauMouvement.save();

//         }

//         // Mettre à jour le statut de la commande
//         commande.statut = "reçue";
//         await commande.save();


//         return res.status(200).json({ message: "Commande validée et stock mis à jour." });

//     } catch (error) {
//         console.error("Erreur validation commande:", error);
//         return res.status(500).json({ message: "Erreur serveur." });
//     }
// };

exports.validerCommande = async (req, res) => {
    try {
        const commandeId = req.params.id;
        const adminId = req.auth.adminId || req.auth.userId; // prends ce qui convient, un string
const userId = req.auth.userId; //
console.log(req.body)
        const commande = await Commandes.findById(commandeId);
        if (!commande) {
            return res.status(404).json({ message: "Commande non trouvée." });
        }

        // Vérifie si déjà validée
        if (commande.statut === "reçue" || commande.statut === "validée") {
            return res.status(400).json({ message: "Commande déjà validée." });
        }

        const produitsEnvoyes = req.body.produits; // Liste envoyée depuis le frontend
        console.log(produitsEnvoyes)

        if (!Array.isArray(produitsEnvoyes) || produitsEnvoyes.length === 0) {
            return res.status(400).json({ message: "Aucun produit fourni." });
        }

        // Mettre à jour les stocks
        for (let item of produitsEnvoyes) {
            const produit = await Produits.findById(item.productId);
            if (!produit) continue;

            const ancienStock = produit.stocks;

            produit.stocks += item.quantite;
            await produit.save();

const mouvement = new Mouvements({
  productId: produit._id,
  adminId: adminId,       // string id, PAS l'objet complet
  userId: userId,         // string id
  type: "ajout",
  quantite: item.quantite,
  prix_achat: item.prixAchat,
  ancien_stock: ancienStock,
  nouveau_stock: produit.stocks,
  date: new Date(),
  description: `Commande ${commande.numero} validée – Stock mis à jour.`,
});

            await mouvement.save();
        }

        // Mettre à jour les produits dans la commande avec les nouvelles valeurs
        commande.produits = produitsEnvoyes;
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





