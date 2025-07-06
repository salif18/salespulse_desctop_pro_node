const express = require("express");
const Router = express.Router();

const Mouvement_Controller = require("../controller/mouvement_controller");
const middleware = require("../middlewares/AuthMiddleware");


Router.get("/",middleware,Mouvement_Controller.getMouvements);

// Router.delete("/single/:id",middleware,Mouvement_Controller.delete);

module.exports = Router;