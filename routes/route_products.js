const express = require("express");
const Router = express.Router();

const Product_Controller = require("../controller/produits_controller");
const { middleware, middlewareTokenOnly } = require("../middlewares/AuthMiddleware"); 
// const uploadFile = require("../middlewares/multerlocale")
const cloudFile = require("../middlewares/multercloudinar")

Router.post("/",middleware,cloudFile,Product_Controller.create);
Router.get("/",middleware,Product_Controller.getProduits);
Router.get("/single/:id",middleware,Product_Controller.getOneProduits);
Router.put("/single/:id",middleware,cloudFile,Product_Controller.update);
Router.put("/stocks/:id",middleware,Product_Controller.updateStock);
Router.delete("/single/:id",middleware,Product_Controller.delete);
 
module.exports = Router;