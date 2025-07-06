require("dotenv").config();
const bcrypt = require('bcryptjs');
const Users = require("../models/user_model");
const nodemailer = require("nodemailer");

// Durée de blocage en millisecondes (1 heure)
const BLOCK_DURATION = 60 * 60 * 1000;

// Nombre maximal de tentatives
const TENTATIVES_MAX = 3;

// Fonction pour réinitialiser le token de l'utilisateur
exports.reset = async (req, res) => {
    try {
        const { numero, email } = req.body;

        // Validation des entrées
        if (!numero || !email) {
            return res.status(400).json({
                message: "Le numéro et l'e-mail sont requis."
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                message: "L'e-mail fourni est invalide."
            });
        }

        // Vérifier l'existence de l'utilisateur
        const user = await Users.findOne({
            $and: [{ numero: numero }, { email: email }]
        });

        if (!user) {
            return res.status(401).json({
                message: "Cet utilisateur n'existe pas. Veuillez fournir le numéro et l'email avec lesquels vous vous êtes inscrit."
            });
        }

        // Vérifier si l'utilisateur est bloqué
        if (user.tentatives >= TENTATIVES_MAX && user.tentativesExpires > Date.now()) {
            const tempsDattente = new Date(user.tentativesExpires).toLocaleString();
            return res.status(429).json({
                message: `Nombre maximal de tentatives atteint. Veuillez réessayer après ${tempsDattente.split(" ")[1]}.`
            });
        } else if (user.tentativesExpires <= Date.now()) {
            // Réinitialiser les tentatives si le délai est écoulé
            user.tentatives = 0;
            user.tentativesExpires = null;
        }

        // Générer un nombre aléatoire de 4 chiffres
        const newToken = parseInt(Math.random() * 10000).toString().padStart(4, "0");

        // Mettre à jour le token de l'utilisateur
        user.remember_token = newToken;
        user.tentatives += 1;
        if (user.tentatives >= TENTATIVES_MAX) {
            user.tentativesExpires = Date.now() + BLOCK_DURATION;
        }
        await user.save();

        // Envoyer l'e-mail
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.MAIL_FROM_ADDRESS,
                pass: process.env.MAIL_PASSWORD,
            },
        });

        const mailOption = {
            from: "SalesPulse",
            to: user.email,
            subject: "Code de réinitialisation de mot de passe",
            text: `Votre code de réinitialisation est : ${newToken}`,
        };

        try {
            await transporter.sendMail(mailOption);
            return res.status(200).json({
                message: "Un code de réinitialisation a été envoyé à votre adresse e-mail."
            });
        } catch (emailError) {
            console.error("Erreur lors de l'envoi de l'e-mail :", emailError);
            return res.status(500).json({
                message: "Erreur lors de l'envoi de l'e-mail.",
                error: emailError.message
            });
        }
    } catch (err) {
        console.error("Erreur dans la fonction reset :", err);
        return res.status(500).json({
            message: 'Erreur serveur',
            error: err.message
        });
    }
};
// Fonction pour valider le nouveau mot de passe
exports.valide = async (req, res) => {
    try {
        const { reset_token, new_password, confirm_password } = req.body;

        // Trouver l'utilisateur par token de réinitialisation
        const user = await Users.findOne({ remember_token: reset_token });

        if (!user) {
            return res.status(401).json({
                message: "Ce token a expiré"
            });
        }

        // Vérifier si les mots de passe correspondent
        if (new_password !== confirm_password) {
            return res.status(401).json({
                message: "Les deux mots de passe ne sont pas identiques"
            });
        }

        // Hacher un mot de passe
        const salt = bcrypt.genSaltSync(10);
        // Hasher le nouveau mot de passe
        const hashedNewPassword = bcrypt.hashSync(new_password, salt);

        // Mettre à jour le mot de passe de l'utilisateur et réinitialiser le token
        user.password = hashedNewPassword;
        user.remember_token = null;
        user.tentatives = 0;  // Réinitialiser les tentatives en cas de succès
        user.tentativesExpires = Date.now();  // Réinitialiser l'expiration
        await user.save();

        return res.status(200).json({
            message: "Votre mot de passe a été modifié avec succès"
        });
    } catch (err) {
        return res.status(500).json({
            err: err.message || 'Erreur serveur'
        });
    }
};





