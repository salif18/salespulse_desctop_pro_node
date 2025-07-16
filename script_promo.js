require('dotenv').config();
const mongoose = require('mongoose');
const Produits = require('./models/produits_model'); // adapte le chemin si besoin
const cron = require('node-cron');

// ✅ Fonction principale
async function updatePromoStatus() {
  try {
    // Connexion si non déjà connectée
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.DB_NAME);
      console.log("✅ Base de données connectée");
    }

    const now = new Date();

    const result = await Produits.updateMany(
      {
        isPromo: true,
        date_fin_promo: { $lt: now },
      },
      {
        $set: { isPromo: false, prix_promo: 0 },
      }
    );

    console.log(`🛠️ Produits mis à jour automatiquement : ${result.modifiedCount}`);
  } catch (error) {
    console.error("❌ Erreur :", error);
  }
}

// ✅ Exécuter 1x au démarrage (si besoin immédiat)
updatePromoStatus();

// ✅ Tâche CRON : chaque jour à minuit
cron.schedule('0 0 * * *', () => {
  console.log("⏱️ Exécution CRON : vérification des promos expirées");
  updatePromoStatus();
});


// require('dotenv').config();
// const mongoose = require('mongoose');
// const Produits = require('./models/produits_model'); // Modifie le chemin

// async function updatePromoStatus() {
//   try {
//      await mongoose.connect(process.env.DB_NAME)
//        .then(() => console.log("Base de donneés connectées"))
//        .catch(() => console.log("Echec de connection à la base des données"));
     

//     const now = new Date();

//     const result = await Produits.updateMany(
//       {
//         isPromo: true,
//         date_fin_promo: { $lt: now },
//       },
//       {
//         $set: { isPromo: false },
//       }
//     );

//     console.log(`🛠️ Produits mis à jour : ${result.modifiedCount}`);

//     await mongoose.disconnect();
//     console.log("🔌 Déconnecté de MongoDB");
//   } catch (error) {
//     console.error("❌ Erreur :", error);
//   }
// }

// updatePromoStatus();
