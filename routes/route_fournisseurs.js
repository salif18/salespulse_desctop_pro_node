const express = require("express");
const Router = express.Router();

const Fournisseurs_Controller = require("../controller/fournisseurs_controller");
const middleware = require("../middlewares/AuthMiddleware");


Router.post("/",middleware,Fournisseurs_Controller.create);
Router.get("/:userId",middleware,Fournisseurs_Controller.getFournisseurs);
Router.delete("/single/:id",middleware,Fournisseurs_Controller.delete);

module.exports = Router;