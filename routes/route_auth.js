const express = require("express");
const Router = express.Router();

const Auth_Controller = require("../controller/auth_controller");

const { middleware, middlewareTokenOnly } = require("../middlewares/AuthMiddleware"); 

Router.post("/registre",Auth_Controller.registre);
Router.post("/login",Auth_Controller.login);
Router.delete("/admin-compte",middleware,Auth_Controller.deleteUserAccount)
Router.post("/update_password",middleware,Auth_Controller.updatePassword);
Router.post("/update_user",middleware,Auth_Controller.updateUser);
Router.get("/utilisateurs",middleware,Auth_Controller.getUsers)

module.exports = Router;