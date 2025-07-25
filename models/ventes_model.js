const mongoose = require("mongoose");

// Action future pour mode pro
const venteSchema = new mongoose.Schema({
  facture_number: { type: String, required: true, unique: true }, // ✅ Ajouté ici
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true },
  adminId:{ type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  clientId: { type: mongoose.Schema.Types.ObjectId, }, // si tu gères des clients
  nom: { type: String },
  contactClient: { type: String },
  client_address:{type:String ,},
  produits: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Produits", required: true },
      nom: String,
      image: String,
      prix_achat: { type: Number, required: true }, // prix d'achat à ce moment-là
      prix_unitaire: Number,
      quantite: Number,
      // sous_total: Number, // prix_unitaire * quantite
      stocks: Number,
      remise: { type: Number, default: 0 }, // en FCFA ou %
      remise_type: { type: String, enum: ['fcfa', 'pourcent'], default: 'fcfa' },
      isPromo: {type: Boolean,default: false,},
      prix_vente: { type: Number },
      tva: { type: Number, default: 0 }, // % appliqué (ex: 18)
      frais_livraison: { type: Number, default: 0 }, // en FCFA
      frais_emballage: { type: Number, default: 0 }, // en FCFA
    },
  ],
  operateur:{type:String},
  total: { type: Number, required: true },
  remiseGlobale: { type: Number, default: 0 },
  remiseGlobaleType: { type: String, enum: ['fcfa', 'pourcent'], default: 'fcfa' },
  tvaGlobale: { type: Number, default: 0 },
  livraison: { type: Number, default: 0 },
  emballage: { type: Number, default: 0 },
  montant_recu: { type: Number, required: true, },
  monnaie: { type: Number, default: 0 }, // montant_recu - total,
  reste: { type: Number, default: 0 },
  type_paiement: {
    type: String,
    enum: ['cash', 'mobile money', 'transfert bancaire', 'crédit', 'partiel'], default: 'cash',
  },
  isProforma:{type:Boolean, default:false},
  statut: { type: String, enum: ['payée', 'crédit', 'partiel','converted','proforma'], default: 'payée' },
  date: { type: Date, default: Date.now },
  type: { type: String, enum: ['invoice', 'proforma'], default: 'invoice' },
  //new champs
  retours: [{ type: mongoose.Schema.Types.ObjectId, ref: "Retours" }], // liste des retours liés
  totalRetour: { type: Number, default: 0 }, // somme des montants retournés
  montantRestantDu: { type: Number, default:0 }, // montant encore dû (après retours)
  facture_footer:{type:String},
  footer_alignement:{type:String, default:'gauche'}
}, { timestamps: true });

module.exports = mongoose.model("Ventes", venteSchema);
