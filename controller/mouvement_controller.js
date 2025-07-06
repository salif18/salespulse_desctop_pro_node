const Mouvements = require("../models/mouvement_model");

exports.getMouvements = async (req, res) => {
  try {
    const { productId, type, dateDebut, dateFin, page = 1, limit = 20 } = req.query;
    console.log(req.query)
    
    const filtre = {
      userId: req.auth.userId, // ➕ Filtrer par l'utilisateur connecté
    };
    if (productId) filtre.productId = productId;
    if (type) filtre.type = type;
    if (dateDebut || dateFin) {
      filtre.date = {};
      if (dateDebut) filtre.date.$gte = new Date(dateDebut);
      if (dateFin) filtre.date.$lte = new Date(dateFin);
    }

    const skip = (page - 1) * limit;

    const mouvements = await Mouvements.find(filtre)
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("productId", "nom")
      .populate("userId", "nom");

    const total = await Mouvements.countDocuments(filtre);

    res.status(200).json({
      mouvements: mouvements,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};
