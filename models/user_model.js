//IMPORTATIONS
const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const schema = mongoose.Schema({
    name: { type: String, require: true },
    boutique_name:{type:String},
    numero: { type: String, require: true, unique: true },
    email: { type: String, require: true, unique: true },
    password: { type: String, require: true, min: 6 },
    remember_token: { type: String, default: null },
    tentatives: { type: Number, default: 0 },                  // Champ 'attempts' pour suivre les tentatives, initialisé à 0
    tentativesExpires: { type: Date, default: Date.now },
}, { timestamp: true });

schema.plugin(uniqueValidator)

module.exports = mongoose.model("Users", schema)
