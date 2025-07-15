const Ventes = require("../models/ventes_model")
const Produits = require("../models/produits_model");
const moment = require("moment");
const mongoose = require("mongoose");
const Mouvements = require("../models/mouvement_model");

exports.create = async (req, res) => {
    try {
        console.log(req.body)
        const {       
            userId,
            adminId,
            clientId,
            nom,
            contactClient,
            client_address,
            operateur,
            produits,
            montant_recu,
            type_paiement,
            statut,
            remiseGlobale,
            remiseGlobaleType,
            tvaGlobale ,
            livraison ,
            emballage ,
            date = new Date()
        } = req.body;

        let total = 0;

        // 📦 Construire les produits avec données fixées (prix_achat, prix_unitaire, etc.)
        const produitsComplets = [];

        for (const item of produits) {
            const produit = await Produits.findById(item.productId);
            if (!produit) {
                return res.status(404).json({ message: `Produit introuvable: ${item.productId}` });
            }

            if (produit.stocks < item.quantite) {
                return res.status(400).json({
                    message: `Stock insuffisant pour "${produit.nom}"`,
                    stock_dispo: produit.stocks,
                    quantite_demandee: item.quantite
                });
            }

            let prixUnitaire = item.prix_unitaire;

            // Appliquer la remise
            if (item.remise_type === 'fcfa') {
                prixUnitaire -= item.remise;
            } else if (item.remise_type === 'pourcent') {
                prixUnitaire -= (prixUnitaire * item.remise) / 100;
            }
            if (prixUnitaire < 0) prixUnitaire = 0;

            // Total brut sans TVA
            let sousTotalBrut = prixUnitaire * item.quantite;

            // TVA
            let montantTVA = 0;
            if (item.tva > 0) {
                montantTVA = (sousTotalBrut * item.tva) / 100;
            }

            // Total final avec TVA + frais
            const sous_total = sousTotalBrut + montantTVA + (item.frais_livraison || 0) + (item.frais_emballage || 0);

            // On cumule dans total global
            total += sous_total;


            produitsComplets.push({
                productId: produit._id,
                nom: produit.nom,
                image: produit.image || "",
                prix_achat: produit.prix_achat,
                prix_vente:item.prix_vente,
                isPromo:item.isPromo,
                prix_unitaire: item.prix_unitaire,
                quantite: item.quantite,
                sous_total,
                stocks: produit.stocks,
                remise: item.remise || 0,
                remise_type: item.remise_type || "fcfa",
                tva: item.tva || 0,
                frais_livraison: item.frais_livraison || 0,
                frais_emballage: item.frais_emballage || 0
            });
        }

        // 🧮 Appliquer la remise globale
        if (remiseGlobaleType === "pourcent") {
            total = total - (total * remiseGlobale / 100);
        } else {
            total = total - remiseGlobale;
        }

        // 🧾 TVA Globale
        if (tvaGlobale > 0) {
            total = total + (total * tvaGlobale / 100);
        }

        // ➕ Ajouter livraison/emballage
        total += livraison + emballage;

        const monnaie = montant_recu - total;
        const reste = total - montant_recu;

        
        // ✅ Génération du numéro de facture
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const startOfMonth = new Date(year, now.getMonth(), 1);
        const endOfMonth = new Date(year, now.getMonth() + 1, 0, 23, 59, 59);
        const ventesDuMois = await Ventes.countDocuments({
            date: { $gte: startOfMonth, $lte: endOfMonth }
        });
        const compteur = String(ventesDuMois + 1).padStart(4, '0');
        const facture_number = `FAC-${year}-${month}-${compteur}`;

        // ✅ Enregistrement de la vente
        const nouvelleVente = new Ventes({
            facture_number,
            userId,
            adminId,
            clientId: clientId || new mongoose.Types.ObjectId(),
            nom,
            contactClient,
            client_address,
            produits: produitsComplets,
            total,
            operateur,
            remiseGlobale,
            remiseGlobaleType,
            tvaGlobale,
            livraison,
            emballage,
            montant_recu,
            monnaie: monnaie > 0 ? monnaie : 0,
            reste: reste > 0 ? reste : 0,
            type_paiement,
            statut,
            date
        });

        const venteSauvegardee = await nouvelleVente.save();

        // 🔄 Mise à jour des stocks + mouvements
        for (const item of produits) {
            const produit = await Produits.findById(item.productId);
            const ancienStock = produit.stocks;

            produit.stocks -= item.quantite;
            const nouveauStock = produit.stocks;

            await produit.save();

            const mouvement = new Mouvements({
                productId: produit._id,
                userId,
                adminId,
                type: "vente",
                quantite: item.quantite,
                prix_achat: item.prix_achat,
                ancien_stock: ancienStock,
                nouveau_stock: nouveauStock,
                description: `Vente à ${nom || "client"}`
            });

            await mouvement.save();
        }

        return res.status(201).json({
            message: "✅ Vente enregistrée avec succès",
            vente: venteSauvegardee
        });

    } catch (error) {
        console.error("❌ Erreur création vente :", error.message);
        return res.status(500).json({
            message: "Erreur lors de la création de la vente",
            error: error.message
        });
    }
};


// Route pour obtenir toutes les ventes
exports.getVentes = async (req, res, next) => {
    try {
        const { adminId } = req.auth; // On récupère adminId depuis le token

    if (!adminId) {
      return res.status(400).json({
        message: 'adminId est requis',
      });
    }
        const { dateDebut, dateFin, clientId } = req.query;

        const filter = {};

        if (adminId) filter.adminId = adminId;
        if (clientId) filter.clientId = clientId;

        if (dateDebut && dateFin) {
            filter.date = {
                $gte: new Date(dateDebut),
                $lte: new Date(dateFin),
            };
        }

        const ventes = await Ventes.find(filter)
            .sort({ date: -1 })
            .populate({
                path: "clientId",
                select: "nom contact",
            })
            .exec();

        return res.status(200).json({
            success: true,
            message: "Historique des ventes récupéré avec succès",
            ventes,
        });
    } catch (error) {
        console.error("Erreur lors de la récupération des ventes :", error);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération des ventes",
        });
    }
};


exports.delete = async (req, res, next) => {
    try {
        const { id } = req.params
        // Trouver la vente par ID
        const vente = await Ventes.findById(id);

        if (!vente) {
            return res.status(404).json({ message: 'Vente non trouvée' });
        }

        // Trouver le produit associé à la vente
        const product = await Produits.findById(vente.productId);

        if (!product) {
            return res.status(404).json({ message: 'Produit non trouvé' });
        }

        // Mettre à jour le stock du produit en ajoutant la quantité annulée
        product.stocks += vente.qty;
        await product.save();

        // Supprimer la vente
        await vente.deleteOne();

        return res.status(200).json(
            { message: 'Annulée !!', results: vente },
        );

    } catch (err) {
        return res.status(500).json(
            { message: 'Erreur lors de l\'annulation de la vente', error: err.message },
        );
    }
};  