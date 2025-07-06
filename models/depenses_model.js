const mongoose = require("mongoose");

const schema = mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
    montants: { type: Number, required: true },
    motifs: { type: String, required: true },
    type: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model("Depenses", schema);
