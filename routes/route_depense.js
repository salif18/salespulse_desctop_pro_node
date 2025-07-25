const express = require("express");
const Router = express.Router();

const Depenses_Controller = require("../controller/depenses_controller");
const { middleware, middlewareTokenOnly } = require("../middlewares/AuthMiddleware"); 


Router.post("/",middleware,Depenses_Controller.create);
Router.get("/",middleware,Depenses_Controller.getDepenses);
Router.delete("/single/:id",middleware,Depenses_Controller.delete);

module.exports = Router;