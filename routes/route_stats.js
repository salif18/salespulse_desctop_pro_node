const express = require("express");
const router = express.Router();
const getStatistiques  = require("../controller/stats_controller");
const middleware = require("../middlewares/AuthMiddleware")

router.get("/",middleware, getStatistiques.getStatistiquesGenerales);
router.get("/jour",middleware, getStatistiques.getVentesDuJour);
router.get("/semaine",middleware, getStatistiques.getVentesHebdomadaires);
router.get("/annee",middleware, getStatistiques.getVentesAnnee);
router.get("/clients-en-retard",middleware, getStatistiques.getClientsEnRetard);


module.exports = router;
