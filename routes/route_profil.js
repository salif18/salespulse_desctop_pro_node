const express = require("express");
const Router = express.Router();

const Profil_Controller = require("../controller/profil_controller");
const { middleware, middlewareTokenOnly } = require("../middlewares/AuthMiddleware"); 
const cloudFile = require("../middlewares/multercloudinar")

Router.post("/",middleware,cloudFile,Profil_Controller.create);
Router.get("/image",middleware,Profil_Controller.getProfils);
Router.put("/single/:id",middleware,cloudFile,Profil_Controller.update);
Router.delete("/single/:id",middleware,Profil_Controller.delete);

module.exports = Router; 