//CREATION DU SERVER POUR LIRE APPLICATION APP
// Charger les variables d'environnement
require('dotenv').config(); 
const http = require("http");
const app = require("./app");

app.set(process.env.PORT);

//CREER LE SERVER
const server = http.createServer(app);

//LECTURE DU SERVER DEMARE APP
server.listen(process.env.PORT,
    () => console.log(`Application en marche sur PORT:${process.env.PORT}`));

    

// {
//   "version": 2,
//   "builds": [
//     {
//       "src": "./server.js",
//       "use": "@vercel/node",
//       "config": {
//         "maxLambdaSize": "15mb",
//         "includeFiles": [
//           "node_modules/**",
//           "models/**",
//           ".env"
//         ] 
//       }
//     }
//   ],
//   "routes": [
//     {
//       "src": "/(.*)",
//       "dest": "/server.js",
//       "methods": ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
//       "headers": {
//         "Access-Control-Allow-Origin": "*",
//         "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,PATCH,OPTIONS",
//         "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With"
//       }
//     }
//   ]
// }


