require('dotenv').config(); 
const mongoose = require("mongoose");

let isConnected = false;

async function connectDB() {
  if (isConnected) return; // éviter de reconnecter plusieurs fois

  try {
    const db = await mongoose.connect(process.env.DB_NAME);
    isConnected = db.connections[0].readyState;
    console.log("Server connecté à la base de données MongoDB ✅");
  } catch (err) {
    console.error("❌ Erreur connexion DB:", err);
    throw err;
  }
}

module.exports = connectDB;
