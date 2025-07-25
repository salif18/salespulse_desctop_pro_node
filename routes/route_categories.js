const express = require("express");
const Router = express.Router();

const Categories_Controller = require("../controller/categorie_controller");
const { middleware, middlewareTokenOnly } = require("../middlewares/AuthMiddleware"); 


Router.post("/",middleware,Categories_Controller.create);
Router.get("/",middleware,Categories_Controller.getCategories);
Router.delete("/single/:id",middleware,Categories_Controller.delete);

module.exports = Router;