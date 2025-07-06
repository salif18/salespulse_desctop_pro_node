const mongoose = require("mongoose");

// action future pour mode pro
const produitSchema = new mongoose.Schema({
  userId: {type: mongoose.Schema.Types.ObjectId,ref: 'Users',required: true},
  cloudinaryId: { type: String },
  image: { type: String },
  nom: {type: String,required: true,trim: true},
  categories: { type: String, required: true },
  description: {type: String,default: ""},
  prix_achat: { type: Number, required: true },
  prix_vente: { type: Number, required: true },
  stocks: { type: Number, required: true },
  seuil_alerte: {type: Number,default: 5,}, // Pour alerte de stock faible
  unite: {type: String,default: 'pièce'},
  statut: { type: String, enum: ['disponible', 'indisponible'],default: 'disponible',},
  isPromo: {type: Boolean,default: false,},
  prix_promo: {type: Number,default: 0,},
  date_achat: { type: Date, required: true },
  date_expiration: {type: Date,},

}, { timestamps: true });

module.exports = mongoose.model("Produits", produitSchema);
