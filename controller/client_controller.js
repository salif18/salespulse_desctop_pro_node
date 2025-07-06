const Clients = require("../models/client_model")
const cloudinary = require("../middlewares/cloudinary")

exports.create = async (req, res) => {
    try {
       //valeur initial
        let imageUrl = "";
        let cloudinaryId = "";
        // Vérifier s'il y a un fichier
        if (req.file) {
            // Upload de l'image sur Cloudinary
            const result = await cloudinary.uploader.upload(req.file.path
                , {
                    folder: "salespulse/client_documents"
                }
            );
            imageUrl = result.secure_url;
            cloudinaryId = result.public_id;
        }

        const nouveauClient = new Clients({ 
            ...req.body ,
            userId: req.auth.userId,// Associer le produit à l'utilisateur
            cloudinaryId: cloudinaryId,
            image: req.file ? imageUrl : "",
        });

        const clientSauvegarde = await nouveauClient.save();

        return res.status(201).json({ message: "Ajouté", clients:clientSauvegarde, });
    } catch (err) {
        return res.status(500).json({ message: "Erreur", error: err.message });
    }
};

exports.getClients = async (req, res) => {
    try {
        const { userId } = req.params

        if (!userId) {
            return res.status(400).json(
                { message: 'userId est requis' },
            );
        }

        const clients = await Clients.find({ userId }).sort({ nom: 1 });

        return res.status(200).json({ message: "OK", clients:clients });
    } catch (err) {
        return res.status(500).json({ message: "Erreur", error: err.message });
    }
};


exports.delete = async (req, res) => {
    try {
        const { id } = req.params;
        const client = await Clients.findByIdAndDelete(id);

        if (!client) {
            return res.status(404).json({ message: 'fournisseur non trouvé' });
        }

        return res.status(200).json({ message: 'Supprimé !!', client: client });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

