// routes/proforma.js

const ProformaInvoices = require('../models/proforma_model');

// Créer une facture proforma (draft)
exports.create = async (req, res) => {
  try {
    const adminId = req.auth.adminId;
    const { clientName, clientEmail, items } = req.body;

    // Calcul total
    let totalAmount = 0;
    items.forEach(item => {
      item.totalPrice = item.quantity * item.unitPrice;
      totalAmount += item.totalPrice;
    });

    const proforma = new ProformaInvoices({
      adminId,
      clientName,
      clientEmail,
      items,
      totalAmount,
    });

    await proforma.save();
    res.status(201).json(proforma);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Lister toutes les factures proforma de l’admin
exports.getProforma = async (req, res) => {
  try {
    const adminId = req.auth.adminId;
    const proformas = await ProformaInvoices.find({ adminId }).sort({ createdAt: -1 });
    res.status(200).json(proformas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Valider une facture proforma (passage en “validée”)
exports.valideProforma =async (req, res) => {
  try {
    const adminId = req.auth.adminId;
    const id = req.params.id;

    const proforma = await ProformaInvoices.findOne({ _id: id, adminId });
    if (!proforma) return res.status(404).json({ message: 'Facture proforma non trouvée' });

    if (proforma.status !== 'draft' && proforma.status !== 'sent') {
      return res.status(400).json({ message: 'Facture déjà validée ou convertie' });
    }

    proforma.status = 'validated';
    proforma.validatedAt = new Date();

    await proforma.save();
    res.status(200).json(proforma);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

