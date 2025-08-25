require('dotenv').config(); 
const mongoose = require("mongoose");

let isConnected = false;

const connectDB = async () => {
  if (isConnected) return; // éviter de reconnecter plusieurs fois

  try {
    const db = mongoose.connect(process.env.DB_NAME);
    isConnected = db.connections[0].readyState;
    console.log("✅ MongoDB connecté");
  } catch (err) {
    console.error("❌ Erreur connexion DB:", err);
    throw err;
  }
}

module.exports = connectDB;
