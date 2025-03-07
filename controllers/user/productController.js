const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");

const productDetails = async (req, res) => {
    try {
      console.log("Fetching product details...");
      
      const userId = req.session.user;
      const productId = req.query.id;
  
      const userData = userId ? await User.findById(userId) : null;
      
      const product = await Product.findOne({ _id: productId }).populate('category');
      if (!product) {
        return res.redirect("/pageNotFound");
      }
  
      const findCategory = product.category;
      const categoryOffer = findCategory?.categoryOffer || 0;
      const productOffer = product.offerPercentage || 0;
      const combinedOffer = Math.max(categoryOffer, productOffer);
      const discountAmount = (product.regularPrice * combinedOffer) / 100;
      const salePrice = product.regularPrice - discountAmount;
  
      const relatedProducts = await Product.find({ 
        category: findCategory?._id, 
        _id: { $ne: productId } 
      }).limit(3);
  
      res.render("product-details", {
        userData: userData,
        product: product,
        quantity: product.quantity,
        category: findCategory,
        relatedProducts: relatedProducts,
        salePrice: salePrice.toFixed(2)
      });
    } catch (error) {
      console.error("Error fetching product details:", error);
      res.status(500).redirect("/pageNotFound");
    }
  };
  
  
module.exports = {
    productDetails,
};