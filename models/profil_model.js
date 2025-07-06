const mongoose = require("mongoose");

// action future pour mode pro
const schema = new mongoose.Schema({
  userId: {type: mongoose.Schema.Types.ObjectId,ref: 'Users',required: true},
  cloudinaryId: { type: String },
  image: { type: String },

}, { timestamps: true });

module.exports = mongoose.model("Profils", schema);