const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const schema = mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  name: { type: String, required: true },
  boutique_name: { type: String },
  numero: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  role: {
    type: String,
    enum: ["admin", "manager", "comptable", "employe", "caissier"],
    default: "admin"
  },
  password: { type: String, required: true, minlength: 6 },
  remember_token: { type: String, default: null },
  tentatives: { type: Number, default: 0 },
  tentativesExpires: { type: Date, default: Date.now },
}, { timestamps: true });

schema.plugin(uniqueValidator);

module.exports = mongoose.model("Users", schema);
