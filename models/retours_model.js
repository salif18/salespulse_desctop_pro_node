const mongoose = require("mongoose");

const retourSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
    venteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ventes', required: true },
    facture_number: { type: String }, // ✅ Ajouté ici
    clientId: { type: mongoose.Schema.Types.ObjectId, }, // si tu gères des clients
    nom: { type: String },
    contactClient: { type: String },
    client_address: { type: String, },
    produits: [
        {
            productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Produits', required: true },
            image: { type: String },
            nom: { type: String },
            quantite: { type: Number, required: true },
            raison: { type: String }, // Ex: "produit défectueux", "non conforme", etc.
            prixVente: Number, // prix de vente du produit à ce moment-là
            prixAchat: Number  // prix d’achat du produit à ce moment-là
        },
    ],
    type_retour: { type: String, enum: ['remboursement', 'avoir', 'échange'], default: 'avoir' },
    operateur: { type: String },
    date: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model("Retours", retourSchema);
