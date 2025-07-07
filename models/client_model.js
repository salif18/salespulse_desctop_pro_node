const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  nom: {
    type: String,
    required: true,
    trim: true
  },
  contact: {
    type: String,
    required: true,
    trim: true
  },
  image:{type:String},
  credit_total: {
    type: Number,
    required: true,
    default: 0
  }, 
  montant_paye: {
    type: Number,
    required: true,
    default: 0
  },
  reste: {
    type: Number,
    required: true,
    default: 0
  },
  monnaie: {
    type: Number,
    required: true,
    default: 0
  },
  recommandation: {
    type: String,
    default: ''
  },
  statut: {
    type: String,
    enum: ['actif', 'inactif'],
    default: 'actif'
  },
  date: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('Clients', clientSchema);
