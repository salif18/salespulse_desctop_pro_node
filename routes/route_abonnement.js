// routes/abonnement_route.js
const express = require("express");
const Router = express.Router();
const Abonnements_Controller = require("../controller/abonnement_controller");
const middleware = require("../middlewares/AuthMiddleware"); // ton middleware actuel
const middlewareTokenOnly = require("../middlewares/AuthMiddleware"); 

Router.post("/",middlewareTokenOnly, Abonnements_Controller.createAbonnements)
Router.get("/historiques", middleware, Abonnements_Controller.getHistoriqueAbonnements)
Router.get("/valability", middleware, Abonnements_Controller.verifierAbonnement)

module.exports = Router;