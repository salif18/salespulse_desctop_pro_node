const express = require("express");
const router = express.Router();
const getStatistiques  = require("../controller/stats_controller");

router.get("/:userId", getStatistiques.getStatistiquesGenerales);
router.get("/jour/:userId", getStatistiques.getVentesDuJour);
router.get("/semaine/:userId", getStatistiques.getVentesHebdomadaires);
router.get("/annee/:userId", getStatistiques.getVentesAnnee);
router.get("/clients-en-retard/:userId/", getStatistiques.getClientsEnRetard);


module.exports = router;
