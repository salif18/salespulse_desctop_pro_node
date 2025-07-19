const express = require("express");
const Router = express.Router();

const Clients_Controller = require("../controller/client_controller");
const cloudFile = require("../middlewares/multercloudinar")
const { middleware, middlewareTokenOnly } = require("../middlewares/AuthMiddleware"); 


Router.post("/",middleware,cloudFile,Clients_Controller.create);
Router.get("/",middleware,Clients_Controller.getClients);
Router.delete("/single/:id",middleware,Clients_Controller.delete);

module.exports = Router;