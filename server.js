//CREATION DU SERVER POUR LIRE APPLICATION APP
require('dotenv').config(); // Charger les variables d'environnement
const http = require("http");
const app = require("./app");

app.set(process.env.PORT);

//CREER LE SERVER
const server = http.createServer(app);

//LECTURE DU SERVER DEMARE APP
server.listen(process.env.PORT,()=>console.log(`Application en marche sur PORT:${process.env.PORT}`));