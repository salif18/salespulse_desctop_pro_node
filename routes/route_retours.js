const express = require("express");
const Router = express.Router();
const Retours_Controller = require("../controller/retours_controller");
const { middleware, middlewareTokenOnly } = require("../middlewares/AuthMiddleware"); 


Router.post("/",middleware, Retours_Controller.creerRetour)
Router.get("/", middleware, Retours_Controller.getRetours)


module.exports = Router;