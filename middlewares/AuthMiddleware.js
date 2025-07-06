require("dotenv").config();
const jwt = require("jsonwebtoken");


const middleware = (req, res, next) => {
  try {
    // RECUPERER LE TOKEN DANS L'ENTETE
    const token = req.headers.authorization.split(' ')[1];
  
    //COMPARER CE TOKEN AU KEY_SECRET
    const verifyAndDecoded = jwt.verify(token, process.env.SECRET_KEY);

    //RECUPERER USERID DANS CE TOKEN
    const userId = verifyAndDecoded.userId;
    //INSERER USERID DANS UN NOUVEAU OBJET QUI SERA UTILISER ULTERIEUREMENT
    req.auth = { userId: userId };

    //ACCEDER A LA ROUTE SUIVANTE
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Le token est invalide ' });
  }
};

module.exports = middleware;
