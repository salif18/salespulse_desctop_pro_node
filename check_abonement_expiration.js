// cron/check_abonnement.js
const Abonnements = require("./models/abonnement_model");
const Users = require("./models/user_model");
const sendSms = require("../utils/sendSms"); // ou sendMail

async function checkAbonnementExpiration() {
  const demain = new Date();
  demain.setDate(demain.getDate() + 1);

  const abonnementsExpirant = await Abonnements.find({
    statut: "actif",
    date_fin: {
      $lte: demain,
      $gt: new Date(), // entre maintenant et demain
    },
  }).populate("userId");

  for (const abonnement of abonnementsExpirant) {
    const user = abonnement.adminId;
    if (user.numero) {
      await sendSms(user.numero, "⏳ Votre abonnement expire demain. Renouvelez-le pour continuer à utiliser l’application.");
    }
    // ou envoie un email ou notification in-app
  }

  console.log("✅ Notifications envoyées pour les abonnements expirant demain.");
}

checkAbonnementExpiration();
