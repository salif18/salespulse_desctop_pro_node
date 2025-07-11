const mongoose = require("mongoose");

const paiementSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
  montant: { type: Number, required: true },
  type: { type: String, enum: ['essai','mensuel', 'premium'], required: true },
  moyen_paiement: { type: String, default: 'inconnu' }, // ex: mobile money, carte, espèce...
  statut: { type: String, enum: ['réussi', 'échoué'], default: 'réussi' },
  date_paiement: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model("Paiements", paiementSchema);
