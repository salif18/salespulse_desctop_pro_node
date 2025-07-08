const mongoose = require("mongoose");

const creditSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  adminId:{ type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  nom: {
    type: String,
    required: true,
    trim: true,
  },
  contact: {
    type: String,
    required: true,
  },
  credit_total: {
    type: Number,
    required: true,
    default: 0,
  },
  montant_paye: {
    type: Number,
    required: true,
    default: 0,
  },
  reste: {
    type: Number,
    required: true,
    default: 0,
  },
  monnaie: {
    type: Number,
    required: true,
    default: 0,
  },
  recommandation: {
    type: String,
    default: "Aucune",
  },
  statut: {
    type: String,
    default: "dette non reglée",
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Credits", creditSchema);
