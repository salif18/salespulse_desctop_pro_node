require("dotenv").config();
const jwt = require("jsonwebtoken");
const Users = require("../models/user_model"); // Assure-toi du bon chemin

const middleware = async (req, res, next) => {
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

module.exports = middleware;


// require("dotenv").config();
// const jwt = require("jsonwebtoken");


// const middleware = (req, res, next) => {
//   try {
//     // RECUPERER LE TOKEN DANS L'ENTETE
//     const token = req.headers.authorization.split(' ')[1];
  
//     //COMPARER CE TOKEN AU KEY_SECRET
//     const verifyAndDecoded = jwt.verify(token, process.env.SECRET_KEY);

//     //RECUPERER USERID DANS CE TOKEN
//     const userId = verifyAndDecoded.userId;
//     //INSERER USERID DANS UN NOUVEAU OBJET QUI SERA UTILISER ULTERIEUREMENT
//     req.auth = { userId: userId };

//     //ACCEDER A LA ROUTE SUIVANTE
//     next();
//   } catch (err) {
//     return res.status(401).json({ error: 'Le token est invalide ' });
//   }
// };

// module.exports = middleware;
