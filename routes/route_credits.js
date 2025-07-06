const express = require("express");
const Router = express.Router();

const Credits_Controller = require("../controller/credits_controller");
const middleware = require("../middlewares/AuthMiddleware");


Router.post("/",middleware,Credits_Controller.create);
Router.get("/:userId",middleware,Credits_Controller.getCredits);
Router.delete("/single/:id",middleware,Credits_Controller.delete);

module.exports = Router;