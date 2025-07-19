const express = require("express");
const Router = express.Router();

const Reglement_Controller = require("../controller/reglement_controller");
const { middleware, middlewareTokenOnly } = require("../middlewares/AuthMiddleware"); 


Router.post("/",middleware,Reglement_Controller.create);
Router.get("/",middleware,Reglement_Controller.getReglements);
Router.delete("/single/:id",middleware,Reglement_Controller.delete);

module.exports = Router;