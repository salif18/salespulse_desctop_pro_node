// models/mouvement_model.js
const mongoose = require("mongoose");

const mouvementSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Produits", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true },
  type: { type: String, enum: ["ajout", "vente", "retrait", "perte", "modification","retour"], required: true },
  adminId:{ type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  quantite: { type: Number, required: true },
  prix_achat: { type: Number, required: true },
  ancien_stock: Number,
  nouveau_stock: Number,
  description: String,
  date: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model("Mouvements", mouvementSchema);