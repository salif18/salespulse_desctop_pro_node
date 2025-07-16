// controllers/factureSettingsController.js
const FactureSettings = require('../models/facture_settings_model');

// ✅ Mettre à jour le préfixe et/ou le pied de page
exports.updateFactureSettings = async (req, res) => {
  try {

    const { prefix, footer, alignement } = req.body;
    const {adminId }= req.auth

    if (!adminId) {
      return res.status(400).json({ message: 'adminId requis' });
    }

    let settings = await FactureSettings.findOne({ adminId });
    if (!settings) {
      settings = new FactureSettings({ adminId });
    }

    if (prefix && typeof prefix === 'string') {
      settings.facturePrefix = prefix;
    }

    if (footer && typeof footer === 'string') {
      settings.factureFooter = footer;
    }

    if (alignement && typeof alignement === 'string') {
      settings.footerAlignement = alignement;
    }

    await settings.save();

    res.status(200).json({
      message: 'Paramètres de facture mis à jour avec succès',
      facturePrefix: settings.facturePrefix,
      factureFooter: settings.factureFooter,
      footerAlignement:settings.footerAlignement
    });
  } catch (error) {
    console.error('Erreur updateFactureSettings:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ✅ Obtenir les paramètres de facture (préfixe + footer)
exports.getFactureSettings = async (req, res) => {
  try {
    const { adminId } = req.auth;

    if (!adminId) {
      return res.status(400).json({ message: 'adminId requis' });
    }

    const settings = await FactureSettings.findOne({ adminId });

    res.status(200).json({
      facturePrefix: settings?.facturePrefix || 'FAC',
      factureFooter: settings?.factureFooter || ''
    });
  } catch (error) {
    console.error('Erreur getFactureSettings:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
