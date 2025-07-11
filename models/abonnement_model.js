const mongoose = require("mongoose");

const abonnementSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true },
  type: { type: String, enum: ['essai','mensuel', 'premium'], default: 'essai' },
  date_debut: { type: Date, required: true },
  date_fin: { type: Date, required: true },
  statut: { type: String, enum: ['actif', 'expiré'], default: 'actif' },
}, { timestamps: true });

module.exports = mongoose.model("Abonnements", abonnementSchema);
