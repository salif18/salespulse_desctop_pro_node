// models/ProformaInvoice.js
const mongoose = require('mongoose');

const ProformaInvoiceSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // propriétaire
  clientName: { type: String, required: true },
  clientEmail: { type: String, required: true },
  items: [{
    description: String,
    quantity: Number,
    unitPrice: Number,
    totalPrice: Number
  }],
  totalAmount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['draft', 'sent', 'validated', 'converted'],
    default: 'draft'
  },
  createdAt: { type: Date, default: Date.now },
  validatedAt: Date,
  convertedAt: Date,
});

module.exports = mongoose.model('ProformaInvoices', ProformaInvoiceSchema);
