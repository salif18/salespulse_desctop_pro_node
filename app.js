//CREATION DE MON APPLICATION 
const express = require("express");
//const mongoose = require("mongoose");
const cors = require("cors");
const connectDB = require("./database/connect_db");

// Établir la connexion à la base de données
connectDB()

require('./script_promo'); // ou le bon chemin selon ton fichier
require('./check_abonement_expiration'); 
const Auth_Router = require("./routes/route_auth");
const Profil_Router = require("./routes/route_profil")
const Reset_Router = require("./routes/route_reset");
const Products_Router = require("./routes/route_products")
const Ventes_Router = require("./routes/route_ventes")
const Categories_Router = require("./routes/route_categories")
const Depenses_Router = require("./routes/route_depense")
const Fournisseurs_Router = require("./routes/route_fournisseurs")
const Clients_Router = require("./routes/route_clients")
const Reglement_Router = require("./routes/route_reglement")
const Mouvements_Router = require("./routes/route_mouvements")
const Statistiques_Router = require("./routes/route_stats")
const Abonnements_Router = require("./routes/route_abonnement")
const Paiements_Router = require("./routes/route_paiement")
const FactureSettings_Router = require("./routes/route_facture_setings")
const FactureProforma_Router = require("./routes/route_proforma")
const Commande_Router = require("./routes/route_commande")
const Retours_Router = require("./routes/route_retours")

const app = express();
app.use(cors());
app.use(express.json());

// Établir la connexion à la base de données
// mongoose.connect(process.env.DB_NAME)
//   .then(() => console.log("Base de donneés connectées"))
//   .catch(() => console.log("Echec de connection à la base des données"));

// Configurer les routes
app.use("/api/auth", Auth_Router);
app.use("/api/profils", Profil_Router)
app.use("/api/reset", Reset_Router);
app.use("/api/products", Products_Router);
app.use("/api/ventes", Ventes_Router);
app.use("/api/categories", Categories_Router);
app.use("/api/depenses", Depenses_Router);
app.use("/api/fournisseurs", Fournisseurs_Router);
app.use("/api/clients",Clients_Router)
app.use("/api/reglements", Reglement_Router)
app.use("/api/mouvements", Mouvements_Router)
app.use("/api/stats", Statistiques_Router)
app.use("/api/abonnements",Abonnements_Router)
app.use("/api/paiements",Paiements_Router)
app.use("/api/facture/settings",FactureSettings_Router)
app.use("/api/proforma",FactureProforma_Router)
app.use("/api/commandes",Commande_Router)
app.use("/api/retours",Retours_Router)

module.exports = app;
