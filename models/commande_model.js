const mongoose = require("mongoose");

const produitCommandeSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Produits", required: true },
  image: { type: String },
  nom:{type:String},
  quantite: { type: Number, required: true },
  prixAchat: { type: Number, required: true },
});

const commandeSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true },
  fournisseurId: { type: mongoose.Schema.Types.ObjectId, ref: "Fournisseurs", required: true },
  fournisseurName: { type: String, required: true },
  fournisseurContact: { type: String },
  fournisseurAddress: { type: String },
  numeroCommande:{type:String},
  produits: [produitCommandeSchema],
  total:{type:Number},
  statut: { type: String, default: "en attente" }, // ou 'validée', 'livrée', etc.
  date: { type: Date, default: Date.now },
  notes: { type: String },
}, {
  timestamps: true // createdAt, updatedAt
});

module.exports = mongoose.model("Commandes", commandeSchema);
