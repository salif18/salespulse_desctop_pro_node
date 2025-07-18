// POST /api/retours
const Mouvements = require('../models/mouvement_model'); // adapte le chemin
const Ventes = require('../models/ventes_model'); // adapte le chemin
const Produits = require('../models/produits_model'); // adapte le chemin
const Retours = require('../models/retours_model'); // adapte le chemin

exports.creerRetour = async (req, res) => {
  try {
    const { venteId, produits, type_retour } = req.body;
    console.log(req.body)

    const vente = await Ventes.findById(venteId).populate('retours');
    if (!vente) return res.status(404).json({ message: "Vente non trouvée" });

    let montantRetourTotal = 0;

    for (let item of produits) {
      const produit = await Produits.findById(item.productId);
      const ligneVente = vente.produits.find(p => p.productId.equals(item.productId));
      
      if (!produit || !ligneVente) continue;

      if (item.quantite > ligneVente.quantite) {
        return res.status(400).json({ message: "Quantité retournée invalide pour " + produit.nom });
      }

      // Calcul du montant du retour (basé sur prix de vente unitaire)
      const prixUnitaire = ligneVente.prix_vente || ligneVente.prix_unitaire || 0;
      montantRetourTotal += prixUnitaire * item.quantite;

      // Mise à jour du stock
      const ancienStock = produit.stocks;
      produit.stocks += item.quantite;
      await produit.save();

      // Enregistrement mouvement
      const mouvement = new Mouvements({
        productId: produit._id,
        userId: vente.userId,
        adminId: vente.adminId,
        type: "retour",
        quantite: item.quantite,
        ancien_stock: ancienStock,
        nouveau_stock: produit.stocks,
        prix_achat: ligneVente.prix_achat,
        description: `Retour produit: ${produit.nom} (${type_retour})`,
      });
      await mouvement.save();
    }

    // Création du retour
    const retour = new Retours({
      venteId,
      produits,
      type_retour,
      userId: vente.userId,
      adminId: vente.adminId,
      ...req.body
    });
    await retour.save();

    // Mise à jour de la vente avec ce retour
    vente.retours.push(retour._id);
    vente.totalRetour += montantRetourTotal;

    // Exemple simple de recalcul montant restant dû
    vente.montantRestantDu = (vente.total || 0) - vente.totalRetour;

    await vente.save();

    res.status(201).json({ message: "Retour enregistré avec succès", retour });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};


// GET /api/retours/admin/:adminId
exports.getRetours = async (req, res) => {
  try {
    const adminId = req.auth.adminId;

    const retours = await Retours.find({ adminId })
      .populate('venteId')
      .populate('clientId')
      .populate('produits.productId')
      .sort({ createdAt: -1 });

    return res.status(200).json(retours);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur serveur lors de la récupération des retours" });
  }
};
