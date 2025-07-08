const mongoose = require("mongoose");

const schema = mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
    adminId:{ type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
    prenom: { type: String, required: true },
    nom: { type: String, required: true },
    numero: { type: Number, required: true },
    address: { type: String, required: true },
    produit: { type: String, required: true },
    
}, { timestamps: true });

module.exports = mongoose.model("Fournisseurs", schema);

