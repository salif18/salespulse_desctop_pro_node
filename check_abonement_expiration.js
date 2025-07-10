// cron/check_abonnement.js
require("dotenv").config();
const mongoose = require("mongoose");
const Abonnements = require("../models/abonnement_model");
const sendSms = require("../utils/sendSms");
const nodemailer = require("nodemailer");

// 🔄 Connexion à MongoDB (adapte ton URI)
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function checkAbonnementExpiration() {
  const maintenant = new Date();
  const demain = new Date(maintenant);
  demain.setDate(demain.getDate());

  // 1️⃣ Notifier les abonnements qui expirent demain
  const abonnementsExpirant = await Abonnements.find({
    statut: "actif",
    date_fin: { $lte: demain, $gt: maintenant },
  }).populate("adminId");

  for (const abonnement of abonnementsExpirant) {
    const user = abonnement.adminId;
    if (user) {
      // SMS
      if (user.numero) {
        await sendSms(
          user.numero,
          "⏳ Votre abonnement expire demain. Renouvelez-le pour continuer à utiliser l’application."
        );
      }
      // Email
      if (user.email) {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.MAIL_FROM_ADDRESS,
            pass: process.env.MAIL_PASSWORD,
          },
        });
        const mailOption = {
          from: process.env.MAIL_FROM_ADDRESS,
          to: user.email,
          subject: "Avertissement - Abonnement expire bientôt",
          text: "⏳ Votre abonnement expire demain. Merci de le renouveler pour continuer à utiliser l’application.",
        };
        await transporter.sendMail(mailOption);
      }
      console.log(`📢 Notifié ${user.email} / ${user.numero} : expiration demain.`);
    }
  }

  // 2️⃣ Passer en "expiré" les abonnements déjà terminés
  const abonnementsATerminer = await Abonnements.updateMany(
    { statut: "actif", date_fin: { $lt: maintenant } },
    { statut: "expiré" }
  );
  console.log(`✅ ${abonnementsATerminer.modifiedCount} abonnements passés en "expiré".`);
}

checkAbonnementExpiration()
  .then(() => {
    console.log("✔️ Processus terminé.");
    mongoose.disconnect();
  })
  .catch(err => {
    console.error("❌ Erreur dans cron:", err);
    mongoose.disconnect();
  });


// // cron/check_abonnement.js
// const Abonnements = require("./models/abonnement_model");
// const sendSms = require("../utils/sendSms"); // ou sendMail
// const nodemailer = require("nodemailer");

// async function checkAbonnementExpiration() {
//   const demain = new Date();
//   demain.setDate(demain.getDate() + 1);

//   const abonnementsExpirant = await Abonnements.find({
//     statut: "actif",
//     date_fin: {
//       $lte: demain,
//       $gt: new Date(), // entre maintenant et demain
//     },
//   }).populate("adminId");

//   for (const abonnement of abonnementsExpirant) {
//     const user = abonnement.adminId;
//     if (user.numero) {
//       await sendSms(user.numero, "⏳ Votre abonnement expire demain. Renouvelez-le pour continuer à utiliser l’application.");
//       // Envoyer l'e-mail
//       const transporter = nodemailer.createTransport({
//         service: "gmail",
//         auth: {
//           user: process.env.MAIL_FROM_ADDRESS,
//           pass: process.env.MAIL_PASSWORD,
//         },
//       });

//       const mailOption = {
//         from: "SalesPulse",
//         to: user.email,
//         subject: "Avertissement de fin d'abonnement",
//         text: "⏳ Votre abonnement expire demain. Renouvelez-le pour continuer à utiliser l’application.",
//       };
//       await transporter.sendMail(mailOption);
//     }
//     // ou envoie un email ou notification in-app
//   }

//   console.log("✅ Notifications envoyées pour les abonnements expirant demain.");
// }

// checkAbonnementExpiration();
