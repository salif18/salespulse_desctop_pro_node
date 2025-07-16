require("dotenv").config();
const mongoose = require("mongoose");
const Abonnements = require("./models/abonnement_model");
const nodemailer = require("nodemailer");
const cron = require("node-cron");

// 🔄 Connexion à MongoDB une seule fois
mongoose.connect(process.env.DB_NAME).then(() => {
  console.log("✅ Connecté à MongoDB pour l'abonnement.");
}).catch((err) => {
  console.error("❌ Erreur de connexion MongoDB :", err);
});

async function checkAbonnementExpiration() {
  const maintenant = new Date();
  const demain = new Date(maintenant);
  demain.setDate(demain.getDate() + 1);

  try {
    // 1️⃣ Notifier les abonnements qui expirent demain
    const abonnementsExpirant = await Abonnements.find({
      statut: "actif",
      date_fin: { $lte: demain, $gt: maintenant },
    }).populate("adminId");

    for (const abonnement of abonnementsExpirant) {
      const user = abonnement.adminId;

      if (user) {
        // // ✅ Envoi SMS
        // if (user.numero) {
        //   await sendSms(
        //     user.numero,
        //     "⏳ Votre abonnement expire demain. Renouvelez-le pour continuer à utiliser l’application."
        //   );
        // }

        // ✅ Envoi Email
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

        console.log(`📢 Notifié ${user.email ?? ''} / ${user.numero ?? ''} : expiration demain.`);
      }
    }

    // 2️⃣ Expirer les abonnements déjà terminés
    const result = await Abonnements.updateMany(
      { statut: "actif", date_fin: { $lt: maintenant } },
      { statut: "expiré" }
    );

    console.log(`✅ ${result.modifiedCount} abonnements passés en "expiré".`);
  } catch (err) {
    console.error("❌ Erreur durant la vérification des abonnements :", err);
  }
}

// ✅ Exécution initiale immédiate
checkAbonnementExpiration();

// ✅ CRON : exécution chaque jour à minuit
cron.schedule("0 0 * * *", async () => {
  console.log("🕛 CRON - Vérification automatique des abonnements...");
  await checkAbonnementExpiration();
});
