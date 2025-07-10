const express = require("express");
const Router = express.Router();
const paiementController = require("../controller/paiements_controller");
const middleware = require("../middlewares/AuthMiddleware"); 

Router.post("/",middleware, paiementController.createPaiement);
Router.get("/mes",middleware, paiementController.getMesPaiements);
Router.get("/all",paiementController.getAllPaiements);

module.exports = Router;