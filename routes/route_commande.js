const express = require("express");
const Router = express.Router();

const Commande_Controller = require("../controller/commande_controller");
const middleware = require("../middlewares/AuthMiddleware");


Router.post("/",middleware,Commande_Controller.create);
Router.get("/",middleware,Commande_Controller.getCommandes);
Router.put('/:id/valider',middleware,Commande_Controller.validerCommande)
Router.delete("/:id",middleware,Commande_Controller.delete);

module.exports = Router;