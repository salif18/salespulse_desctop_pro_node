const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

// 🧩 Import de tous les modèles
const Categories = require("./models/categories_model");
const Clients = require("./models/client_model");
const Depense = require("./models/depenses_model");
const Fournisseurs = require("./models/fournisseurs_model");
const Mouvements = require("./models/mouvement_model");
const Produits = require("./models/produits_model");
const Profils = require("./models/profil_model");
const Reglements = require("./models/reglement_model");
const Ventes = require("./models/ventes_model");
const Users = require("./models/user_model");

async function runMigration() {
  await mongoose.connect(process.env.DB_NAME);

  // Étape 1 : Obtenir la liste des utilisateurs
  const users = await Users.find();

  // Étape 2 : Créer une map utilisateur => adminId
  const userMap = {};
  users.forEach(u => {
    userMap[u._id.toString()] = u.adminId || u._id; // si pas d’adminId => c’est lui-même l’admin
  });

  // Étape 3 : Fonction de mise à jour par collection
  const updateAdminId = async (Model, collectionName) => {
    const docs = await Model.find({});

    for (const doc of docs) {
      const userId = doc.userId?.toString();
      const adminId = userMap[userId];

      if (!adminId) {
        
        continue;
      }

      // Ne pas écraser si adminId déjà présent
      if (!doc.adminId) {
        await Model.updateOne({ _id: doc._id }, { $set: { adminId } });
        console.log(`✅ adminId ajouté à ${collectionName} : ${doc._id}`);
      }
    }
  };

  // Étape 4 : Appliquer à toutes les collections nécessaires
  await updateAdminId(Produits, 'Produits');
  await updateAdminId(Ventes, 'Ventes');
  await updateAdminId(Clients, 'Clients');
  await updateAdminId(Categories, 'Categories');
  await updateAdminId(Depense, 'Depenses');
  await updateAdminId(Fournisseurs, 'Fournisseurs');
  await updateAdminId(Mouvements, 'Mouvements');
  await updateAdminId(Reglements, 'Reglements');
  await updateAdminId(Profils, 'Profils');

  console.log('🎉 Migration terminée avec succès.');
  await mongoose.disconnect();
}

runMigration().catch(console.error);


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


