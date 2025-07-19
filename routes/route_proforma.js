// routes/proforma.js
const express = require('express');
const Router = express.Router();
const ProformaInvoice = require('../controller/proforma_controller');
const { middleware, middlewareTokenOnly } = require("../middlewares/AuthMiddleware"); 

Router.post("/",middleware,ProformaInvoice.create)
Router.get("/",middleware,ProformaInvoice.getProforma)
Router.patch("/:id/validate",middleware,ProformaInvoice.valideProforma)

module.exports = Router;
