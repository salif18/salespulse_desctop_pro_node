const mongoose = require("mongoose");

const schema = mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
    name: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model("Categories", schema);
