// routes/proforma.js
const express = require('express');
const Router = express.Router();
const ProformaInvoice = require('../controller/proforma_controller');
const authMiddleware = require('../middlewares/AuthMiddleware');

Router.post("/",authMiddleware,ProformaInvoice.create)
Router.get("/",authMiddleware,ProformaInvoice.getProforma)
Router.patch("/:id/validate",authMiddleware,ProformaInvoice.valideProforma)

module.exports = Router;
