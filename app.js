//CREATION DE MON APPLICATION 
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const app = express();
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

app.use(cors());
app.use(express.json());

// Middleware pour servir les fichiers statiques
app.use('/images', express.static(path.join(__dirname, 'public/images')));
app.use('/photos', express.static(path.join(__dirname, 'public/photos')));
app.use('/videos', express.static(path.join(__dirname, 'public/videos')));

// Établir la connexion à la base de données
mongoose.connect(process.env.DB_NAME)
  .then(() => console.log("Base de donneés connectées"))
  .catch(() => console.log("Echec de connection à la base des données"));

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

module.exports = app;
