// models/Settings.js
const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  adminId:{ type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  facturePrefix: { type: String, default: 'FAC'},
  factureFooter:{type:String},
  footerAlignement:{type:String, enum: ['gauche', 'centre', 'droite'], default: 'gauche'},
  // d'autres paramètres si nécessaire
  // Compteurs mensuels
  factureCounter: {
    type: Map,
    of: Number,
    default: {}
  },
  proformaCounter: {
    type: Map,
    of: Number,
    default: {}
  }
}, { timestamps: true });

module.exports = mongoose.model('FactureSettings', settingsSchema);
