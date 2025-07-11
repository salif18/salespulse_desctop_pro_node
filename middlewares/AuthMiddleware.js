require("dotenv").config();
const jwt = require("jsonwebtoken");
const Users = require("../models/user_model");
const Abonnements = require("../models/abonnement_model"); // 🔁 à ajouter

const middleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Token manquant" });

    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    const user = await Users.findById(decoded.userId);
    if (!user) return res.status(401).json({ error: "Utilisateur introuvable" });

    const adminId = user.adminId ? user.adminId : user._id;

    // 🔍 Cherche l’abonnement ACTIF de l’admin
    const abonnement = await Abonnements.findOne({
      adminId: adminId,
      statut: "actif",
      date_fin: { $gte: new Date() }
    }).sort({ date_fin: -1 });

    if (!abonnement) {
      return res.status(403).json({
        error: "Votre abonnement est expiré ou inexistant. Veuillez le renouveler.",
      });
    }

    // ✅ Autoriser la requête
    req.auth = {
      userId: user._id.toString(),
      adminId: adminId.toString(),
      role: user.role,
      abonnement: abonnement.type,
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: "Token invalide ou expiré" });
  }
};

module.exports = middleware;




const middlewareTokenOnly = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: "Token manquant" });
    }

    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    const user = await Users.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: "Utilisateur introuvable" });
    }

    // Injecter userId, adminId et rôle dans la requête
    req.auth = {
      userId: user._id.toString(),
      adminId: user.adminId ? user.adminId : user._id.toString(),
      role: user.role,
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
};

module.exports = middlewareTokenOnly;


