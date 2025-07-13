require("dotenv").config();
const jwt = require("jsonwebtoken");
const bcrypt = require('bcryptjs');
const Users = require("../models/user_model");
const Abonnements = require("../models/abonnement_model"); // 🔁 importe ton modèle Abonnement


// Durée de blocage en millisecondes (1 heure)
const BLOCK_DURATION = 5 * 60 * 1000;

// Nombre maximal de tentatives
const TENTATIVES_MAX = 5;

//FONCTION D'ENREGISTREMENT DES UTILISATEURS
exports.registre = async (req, res) => {
  try {
    const {numero, email, password } = req.body;

    // Vérifiez si l'utilisateur existe
    const userExiste = await Users.findOne({
      $or: [
        { numero: numero },
        { email: email }
      ]
    });

    if (userExiste) {
      return res.status(401).json({
        message: "User existe"
      });
    }
    // Hacher un mot de passe
    const salt = bcrypt.genSaltSync(10);
    // Hacher le mot de passe
    const hashedPassword = bcrypt.hashSync(password, salt);

    // Créer un instance du model user
    const user = new Users({ ...req.body, password: hashedPassword });


    // Enregistrer l'utilisateur
    await user.save();

     // 👉 Ajouter ici l’abonnement d’essai (7 jours)
    const dateDebut = new Date();
    const dateFin = new Date();
    dateFin.setDate(dateDebut.getDate() + 7);

    await Abonnements.create({
      adminId: user._id,
      type: "essai",
      date_debut: dateDebut,
      date_fin: dateFin,
      statut: "actif",
    });

    // Créer un token JWT
    const token = jwt.sign(
      { userId: user._id , adminId: user.adminId || user._id },
      process.env.SECRET_KEY,
      { expiresIn: "24h" }
    );


    // Envoyer la réponse
    return res.status(201).json({
      token: token,
      userId: user._id,
      adminId: user.adminId || user._id,
      role: user.role, // ✅ Ajout ici
      userName: user.name,
      userNumber: user.numero,
      entreprise: user.boutique_name,
      message: "Inscription réussie avec succès"
    });
  } catch (error) {
    res.status(500).json(error);
  }
};

// FONCTION DE CONNEXION DES UTILISATEURS
exports.login = async (req, res) => {
  try {
    const { contacts, password } = req.body;

    const user = await Users.findOne({
      $or: [
        { numero: contacts },
        { email: contacts }
      ]
    })

    if (!user) {
      return res.status(400).json({
        message: "Votre email ou numéro est incorrect"
      });
    }

    // Vérifier si l'utilisateur  a atteint le nombre maximum de tentatives et le bloqué
    if (user.tentatives >= TENTATIVES_MAX && user.tentativesExpires > Date.now()) {
      // Convertir 'tentativesExpires' en heure locale
      const tempsDattente = new Date(user.tentativesExpires).toLocaleString();
      return res.status(429).json({
        message: `Nombre maximal de tentatives atteint. Veuillez réessayer après ${tempsDattente.split(" ")[1]}.`
      });
    }

    const validPassword = bcrypt.compareSync(password, user.password);

    if (!validPassword) {
      // Incrémenter les tentatives
      user.tentatives += 1;
      if (user.tentatives >= TENTATIVES_MAX) {
        // Définir l'expiration si les tentatives maximales sont atteintes
        user.tentativesExpires = Date.now() + BLOCK_DURATION;
      }
      await user.save();
      return res.status(401).json({
        message: "Votre mot de passe est incorrect"
      });
    }
    // Réinitialiser les tentatives en cas de succès
    user.tentatives = 0;
    // Réinitialiser l'expiration
    user.tentativesExpires = Date.now();

    const token = jwt.sign(
      { userId: user._id ,adminId: user.adminId || user._id},
      process.env.SECRET_KEY,
      { expiresIn: "24h" }
    );

    await user.save();

    return res.status(200).json({
      token: token,
      userId: user._id,
      adminId: user.adminId || user._id,
      role: user.role, // ✅ Ajout ici
      userName: user.name,
      userNumber: user.numero,
      entreprise: user.boutique_name || "boutique non defini",
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
};

// LOGOUT
// Fonction de mise à jour du mot de passe
exports.updatePassword = async (req, res) => {
  try {


    const { current_password, new_password, confirm_password } = req.body;
    const userId = req.params.userId;

    // Trouver l'utilisateur par ID
    const user = await Users.findById(userId);
    console.log("user est :", user)
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "Utilisateur non trouvé"
      });
    }

    // Vérification du mot de passe actuel
    const isMatch = await bcrypt.compare(current_password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        status: false,
        message: "Mot de passe actuel incorrect"
      });
    }

    // Vérification que les nouveaux mots de passe correspondent
    if (new_password !== confirm_password) {
      return res.status(400).json({
        status: false,
        message: "Les mots de passe ne correspondent pas"
      });
    }

    // Hachage du nouveau mot de passe et mise à jour de l'utilisateur
    const hashedPassword = await bcrypt.hash(new_password, 10);
    user.password = hashedPassword;

    await user.save();

    return res.status(200).json({
      status: true,
      message: "Mot de passe modifié avec succès"
    });

  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message
    });
  }
};


exports.updateUser = async (req, res) => {
  try {
    const { name, boutique_name, numero, email, password } = req.body;
    const { adminId } = req.auth;

    // Trouver l'utilisateur par ID
    const user = await Users.findById(adminId);

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "Utilisateur non trouvé"
      });
    }

    // Mettre à jour les champs de l'utilisateur existant
    user.name = name ? name : user.name;
    user.boutique_name = boutique_name ? boutique_name : user.boutique_name;
    user.numero = numero ? numero : user.numero;
    user.email = email ? email : user.email;
    user.password = password ? password : user.password; // Optionnel: gérer le hachage du mot de passe si nécessaire

    // Sauvegarder l'utilisateur mis à jour
    await user.save();

    return res.status(200).json({
      status: true,
      message: "Profil modifié avec succès",
      user // Vous pouvez renvoyer l'utilisateur mis à jour si besoin
    });

  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message
    });
  }
};

exports.getUsers = async (req, res) => {
  try {
     const adminId = req.auth?.adminId; // On récupère adminId depuis le token

    if (!adminId) {
      return res.status(400).json({
        message: 'adminId est requis',
      });
    }

   // Récupérer tous les utilisateurs (y compris l'admin) triés par date de création décroissante
const users = await Users.find({
  $or: [
    { adminId: adminId },  // Les utilisateurs normaux avec ce adminId
    { _id: adminId }       // L'administrateur lui-même
  ]
}).sort({ createdAt: -1 });

    // Formater la réponse
    const formattedUsers = users.map(user => ({
      _id: user._id,
      adminId: user.adminId,
      name: user.name,
      numero: user.numero,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    }));

    return res.status(200).json({
      status: true,
      message: 'Liste des utilisateurs récupérée avec succès',
      data: formattedUsers
    });

  } catch (error) {
    console.error('Erreur dans getUsers:', error);
    return res.status(500).json({
      status: false,
      message: 'Erreur serveur lors de la récupération des utilisateurs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};