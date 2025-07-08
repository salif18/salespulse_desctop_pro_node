// models/Reglement.js
const mongoose = require('mongoose');

const reglementSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  adminId:{ type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  venteId: { type: mongoose.Schema.Types.ObjectId, ref: "Ventes", required: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Clients", required: false },
  montant: { type: Number, required: true },
  nom:{type:String},
  type: { type: String, enum: ['règlement', 'remboursement'], default: 'règlement' },
  mode: { type: String, enum: ['cash', 'mobile money', 'transfert bancaire', 'crédit', 'partiel'], required: true },
  date: { type: Date, default: Date.now },
  operateur: { type: String }, 
},{timestamps:true});

module.exports = mongoose.model('Reglements', reglementSchema);
