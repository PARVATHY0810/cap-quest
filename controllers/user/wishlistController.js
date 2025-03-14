const Wishlist = require('../../models/wishListSchema');
const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");
const Category = require ("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const Cart = require("../../models/cartSchema");
const mongoose = require('mongoose');

const checkWishlistStatus = async (req, res) => {
  try {
      const userId = req.session.user;
      const { productId } = req.query;

      if (!mongoose.Types.ObjectId.isValid(productId)) {
          return res.json({ isInWishlist: false });
      }

      if (!userId) {
          return res.json({ isInWishlist: false });
      }

      const wishlist = await Wishlist.findOne({ 
          userId,
          products: { $elemMatch: { productId: new mongoose.Types.ObjectId(productId) } }
      });

      res.json({ 
          isInWishlist: !!wishlist 
      });
  } catch (error) {
      console.error('Error in checkWishlistStatus:', error.message, error.stack);
      res.status(500).json({ error: 'Server error: ' + error.message });
  }
};


const getWishlist = async (req, res) => {
  try {
    const userId = req.session.user;
    let wishlistItems = await Wishlist.findOne({ userId }).populate('products.productId');

    if (!wishlistItems) wishlistItems = { products: [] };

    let cartItems = [];
    if (userId) {
      const cart = await Cart.findOne({ userId }).select("items.productId");
      cartItems = cart && cart.items ? cart.items.map(item => item.productId.toString()) : [];
    }

    const userData = userId ? await User.findById(userId) : null;

    res.render('wishlist', {
      wishlistItems,
      cartItems,
      userData,
      pageTitle: 'My Wishlist',
      error: null 
    });

  } catch (error) {
    console.error('Error fetching wishlist:', error.message, error.stack);
    res.redirect('/wishlist?error=' + encodeURIComponent('Failed to load wishlist. Please try again.'));
  }
};

const addToWishlist = async (req, res) => {
  try {
      const userId = req.session.user;
      const { productId } = req.body;

      console.log('Add to Wishlist - User:', userId, 'Product:', productId);

      if (!userId) {
          console.log('User not authenticated');
          return res.status(401).json({ 
              success: false, 
              message: 'Please login to add to wishlist' 
          });
      }

      if (!mongoose.Types.ObjectId.isValid(productId)) {
          console.log('Invalid product ID:', productId);
          return res.status(400).json({ 
              success: false, 
              message: 'Invalid product ID' 
          });
      }

      const productExists = await Product.findById(productId);
      if (!productExists) {
          console.log('Product not found:', productId);
          return res.status(404).json({ 
              success: false, 
              message: 'Product not found' 
          });
      }

      let wishlist = await Wishlist.findOne({ userId });

      if (!wishlist) {
          console.log('Creating new wishlist for user:', userId);
          wishlist = new Wishlist({
              userId,
              products: [{ productId }]
          });
          await wishlist.save();
          return res.json({ 
              success: true, 
              action: 'added',
              message: 'Added to wishlist' 
          });
      }

      const productIndex = wishlist.products.findIndex(
          item => item.productId.toString() === productId
      );

      if (productIndex === -1) {
          console.log('Adding product to existing wishlist:', productId);
          wishlist.products.push({ productId });
          await wishlist.save();
          return res.json({ 
              success: true, 
              action: 'added',
              message: 'Added to wishlist' 
          });
      } else {
          console.log('Removing product from wishlist:', productId);
          wishlist.products.splice(productIndex, 1);
          await wishlist.save();
          return res.json({ 
              success: true, 
              action: 'removed',
              message: 'Removed from wishlist' 
          });
      }
  } catch (error) {
      console.error('Error in addToWishlist:', error.message, error.stack);
      res.status(500).json({ 
          success: false, 
          message: 'Server error: ' + error.message 
      });
  }
};


const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.session.user;
    const { productId } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: "User not logged in" });
    }

    let wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      return res.status(404).json({ success: false, message: "Wishlist not found" });
    }

    const initialLength = wishlist.products.length;
    wishlist.products = wishlist.products.filter(item => item.productId.toString() !== productId.toString());

    if (wishlist.products.length === initialLength) {
      return res.status(404).json({ success: false, message: "Product not found in wishlist" });
    }

    await wishlist.save();
    res.status(200).json({ success: true, message: "Removed from wishlist" });
  } catch (error) {
    console.error("Error removing from wishlist:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
// const addToCart = async (req, res) => {
//   try {
//     const userId = req.session.user;
//     const { productId } = req.body;

//     if (!userId) {
//       return res.status(401).json({ success: false, message: "User not logged in" });
//     }

//     const product = await Product.findById(productId);
//     if (!product) {
//       return res.status(404).json({ success: false, message: "Product not found" });
//     }

//     if (product.quantity <= 0) {
//       return res.status(400).json({ success: false, message: "Out of Stock" });
//     }

//     const existingCartItem = await Cart.findOne({ 
//       userId, 
//       productId: productId 
//     });

//     if (existingCartItem) {
    
//       existingCartItem.quantity += 1;
//       existingCartItem.totalPrice = existingCartItem.quantity * product.salePrice;
//       await existingCartItem.save();
//     } else {
      
//       const newCartItem = new Cart({
//         userId,
//         productId,
//         quantity: 1,
//         price: product.salePrice,
//         totalPrice: product.salePrice
//       });
//       await newCartItem.save();
//     }

//     res.status(200).json({ success: true, message: "Product added to cart" });

//   } catch (error) {
//     console.error("Error adding to cart:", error);
//     res.status(500).json({ 
//       success: false, 
//       message: "Failed to add product to cart",
//       error: error.message 
//     });
//   }
// };

const addToCart = async (req, res) => {
  try {
    const userId = req.session.user;
    const { productId } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: "User not logged in" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (product.quantity <= 0) {
      return res.status(400).json({ success: false, message: "Out of Stock" });
    }

    const existingCartItem = await Cart.findOne({ userId, productId: productId });

    if (existingCartItem) {
      existingCartItem.quantity += 1;
      existingCartItem.totalPrice = existingCartItem.quantity * product.salePrice;
      await existingCartItem.save();
    } else {
      const newCartItem = new Cart({
        userId,
        productId,
        quantity: 1,
        price: product.salePrice,
        totalPrice: product.salePrice
      });
      await newCartItem.save();
    }

    // Remove the item from the wishlist
    let wishlist = await Wishlist.findOne({ userId });
    if (wishlist) {
      wishlist.products = wishlist.products.filter(item => item.productId.toString() !== productId.toString());
      await wishlist.save();
    }

    res.status(200).json({ success: true, message: "Product added to cart and removed from wishlist" });

  } catch (error) {
    console.error("Error adding to cart:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to add product to cart",
      error: error.message 
    });
  }
};

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  addToCart,
  checkWishlistStatus,
};