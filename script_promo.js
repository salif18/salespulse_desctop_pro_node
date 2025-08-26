require('dotenv').config();
const Produits = require('./models/produits_model'); // adapte le chemin si besoin
const cron = require('node-cron');

// ✅ Fonction principale
async function updatePromoStatus() {
  try {

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