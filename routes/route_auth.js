const express = require("express");
const Router = express.Router();

const Auth_Controller = require("../controller/auth_controller");
const middleware = require("../middlewares/AuthMiddleware");


Router.post("/registre",Auth_Controller.registre);
Router.post("/login",Auth_Controller.login);
Router.post("/update_password/:userId",middleware,Auth_Controller.updatePassword);
Router.post("/update_user/:userId",middleware,Auth_Controller.updateUser);
Router.get("/utilisateurs/:userId",Auth_Controller.getUsers)

module.exports = Router;