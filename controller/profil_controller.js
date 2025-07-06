const Profils = require("../models/profil_model");
const cloudinary = require("../middlewares/cloudinary")

exports.create = async (req, res) => {
  try {
    const userId = req.auth.userId;

    // Étape 1 : Rechercher s'il existe déjà un profil pour ce user
    const profilExist = await Profils.findOne({ userId });

    let imageUrl = "";
    let cloudinaryId = "";

    if (req.file) {
      // Étape 2 : S'il y avait une image précédente, la supprimer de Cloudinary
      if (profilExist && profilExist.cloudinaryId) {
        await cloudinary.uploader.destroy(profilExist.cloudinaryId);
      }

      // Étape 3 : Uploader la nouvelle image
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "salespulse/profils",
      });

      imageUrl = result.secure_url;
      cloudinaryId = result.public_id;
    }

    // Étape 4 : S'il existait un profil, on le met à jour
    if (profilExist) {
      profilExist.image = imageUrl || profilExist.image;
      profilExist.cloudinaryId = cloudinaryId || profilExist.cloudinaryId;

      const updatedProfil = await profilExist.save();
      return res.status(201).json({ message: "Mis à jour", profils: updatedProfil });
    }

    // Étape 5 : Sinon, on en crée un nouveau
    const nouveauProfil = new Profils({
      userId,
      image: imageUrl,
      cloudinaryId,
    });

    const profilSauvegarde = await nouveauProfil.save();
    return res.status(201).json({ message: "Ajouté", profils: profilSauvegarde });

  } catch (err) {
    return res.status(500).json({ message: "Erreur", error: err.message });
  }
};

exports.getProfils = async (req, res) => {
    try {
        const { userId } = req.params

        const profil = await Profils.findOne({ userId });

        if (!profil) {
            return res.status(404).json({ message: 'Profil non trouvé' });
        }

        return res.status(200).json({ message: 'ok', profils: profil });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};


exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ message: 'ID du profil manquant' });
        }

       

        // Trouver le produit existant
        const profil = await Profils.findById(id);

        if (!profil) {
            return res.status(404).json({ message: 'Profil non trouvé' });
        }

        // Vérification d'autorisation
        if (profil.userId.toString() !== req.auth.userId) {
            return res.status(401).json({ message: 'Non autorisé' });
        }

        let imageUrl = profil.photo; // Garder l'image actuelle si pas de mise à jour
        let cloudinaryId = profil.cloudinaryId; // Garder l'ancien Cloudinary ID si non modifié
        if (req.file) {
            // Si le produit a déjà une image associée, la supprimer sur Cloudinary
            if (profil.cloudinaryId) {
                await cloudinary.uploader.destroy(profil.cloudinaryId);
            }

            // Uploader la nouvelle image sur Cloudinary
            const result = await cloudinary.uploader.upload(req.file.path);
            imageUrl = result.secure_url; // URL sécurisée de la nouvelle image
            cloudinaryId = result.public_id; // ID Cloudinary de la nouvelle image
        }

        // Mise à jour du produit avec les nouvelles valeurs
        const profilMisAJour = await Profils.findByIdAndUpdate(
            id,
            {
                image: imageUrl, // URL Cloudinary renvoyée dans req.file.path
                cloudinaryId: cloudinaryId,    
            },
            { new: true } // retourne le document mis à jour
        );

        if (!profilMisAJour) {
            return res.status(400).json({ message: 'Erreur lors de la mise à jour du profil' });
        }

        return res.status(200).json({ message: 'Profil modifié avec succès', profils: profilMisAJour });

    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};


exports.delete = async (req, res) => {
    try {

        const { id } = req.params
        const profil = await Profils.findByIdAndDelete(id);

        if (!profil) {
            return res.status(404).json({ message: 'Produit non trouvé' });
        }


        if (profil.userId.toString() !== req.auth.userId) {
            return res.status(401).json({ message: 'Non autorisé' });
        }
        // Si le produit a un cloudinaryId, supprimer l'image sur Cloudinary
        if (profil.cloudinaryId) {
            await cloudinary.uploader.destroy(profil.cloudinaryId);
        }

        // Supprimer le produit
        await profil.deleteOne({ _id: id });
        // Si l'image est supprimée avec succès, supprimer le produit
        await profil.deleteOne({ _id: id });
        return res.status(200).json({ message: 'Produit et image supprimés avec succès' });



    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};