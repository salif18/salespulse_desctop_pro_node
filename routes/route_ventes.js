const express = require("express");
const Router = express.Router();

const Ventes_Controller = require("../controller/ventes_controller");
const middleware = require("../middlewares/AuthMiddleware");

Router.post("/",middleware,Ventes_Controller.create);
Router.get("/",middleware,Ventes_Controller.getVentes);
Router.delete("/single/:id",middleware,Ventes_Controller.delete);

module.exports = Router;