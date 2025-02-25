const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema")


// const productDetails = async (req, res) => {
//     try {
//         console.log("Fetching product details...");
        
//         const userId = req.session.user;
//         const productId = req.query.id;

//         // Fetch user data if user is logged in
//         const userData = userId ? await User.findById(userId) : null;
        
//         // Fetch product and populate category
//         const product = await Product.findOne({ _id: productId }).populate('category');
//         if (!product) {
//             return res.redirect("/pageNotFound");
//         }

//         const findCategory = product.category;
//         const categoryOffer = findCategory?.categoryOffer || 0;
//         const productOffer = product.productOffer || 0;
//         const totalOffer = categoryOffer + productOffer;

//         // Fetch related products (excluding the current product)
//         const relatedProducts = await Product.find({ 
//             category: findCategory?._id, 
//             _id: { $ne: productId } 
//         }).limit(3);

//         res.render("product-details", {
//             userData: userData,
//             product: product,
//             quantity: product.quantity,
//             category: findCategory,
//             relatedProducts: relatedProducts
//         });
//     } catch (error) {
//         console.error("Error fetching product details:", error);
//         res.status(500).redirect("/pageNotFound");
//     }
// };

// module.exports = {
//     productDetails,
// };
const productDetails = async (req, res) => {
    try {
        console.log("Fetching product details...");
        
        const userId = req.session.user;
        const productId = req.query.id;

        // Fetch user data if user is logged in
        const userData = userId ? await User.findById(userId) : null;
        
        // Fetch product and populate category
        const product = await Product.findOne({ _id: productId }).populate('category');
        if (!product) {
            return res.redirect("/pageNotFound");
        }

        const findCategory = product.category;
        const categoryOffer = findCategory?.categoryOffer || 0;
        const productOffer = product.productOffer || 0;
        const totalOffer = categoryOffer + productOffer;

        // Fetch related products (excluding the current product)
        const relatedProducts = await Product.find({ 
            category: findCategory?._id, 
            _id: { $ne: productId } 
        }).limit(3);

        res.render("product-details", {
            userData: userData,
            product: product,
            quantity: product.quantity,
            category: findCategory,
            relatedProducts: relatedProducts
        });
    } catch (error) {
        console.error("Error fetching product details:", error);
        res.status(500).redirect("/pageNotFound");
    }
};

module.exports = {
    productDetails,
};