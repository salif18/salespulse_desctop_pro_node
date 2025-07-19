// routes/factureSettings.js
const express = require('express');
const Router = express.Router();
const controller = require('../controller/facture_settings_controller');
const { middleware, middlewareTokenOnly } = require("../middlewares/AuthMiddleware"); 

// Modifier préfixe et/ou pied de page
Router.put('/',middleware, controller.updateFactureSettings);

// Obtenir paramètres (préfixe + pied de page)
Router.get('/',middleware, controller.getFactureSettings);

module.exports = Router;
