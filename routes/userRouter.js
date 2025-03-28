const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/userController");
const passport = require("../config/passport");
const { userAuth } = require("../middlewares/auth");
const Product = require("../controllers/user/productController");//njn evide productSchema koduthirunnu athe enthinaa nne but oorna illaa
const profileController = require("../controllers/user/profileController")
const productController = require("../controllers/user/productController")
const cartController = require('../controllers/user/cartController');
const orderController = require('../controllers/user/orderController');
const walletController = require('../controllers/user/walletController');
const wishlistController = require('../controllers/user/wishlistController');

//user manegement
router.get("/pageNotFound",userController.pageNotFound);
router.get("/",userController.loadHomepage);
router.get("/signup",userController.loadSignupPage);
router.post("/signup",userController.signup);
router.post("/check-referral", userController.checkReferralCode);
router.get('/verify-otp',userController.loadOtp);
router.post("/verify-otp",userController.verifyOtp);
router.post("/resend-otp", userController.resendOtp);
router.get("/login",userController.loadLogin);
router.post("/login",userController.login);
router.get("/productdetails",userController.CapProductDetails);
router.get("/auth/google",passport.authenticate("google", { scope: ["profile", "email"] }));
router.get("/auth/google/callback",passport.authenticate("google", { failureRedirect: "/signup" }), userController.handleGoogleLogin);
router.get("/logout",userController.logout);

//password manegement
router.get("/forgot-password", userController.forgotPasssword)
router.post("/reset-password", userController.forgotPassswordSendLink);
router.get("/new-password", userController.newPassword)
router.post("/new-password",userController.changePassword)


//shop
router.get('/shop', userController.loadShop);

//profile Management
router.get("/profile", userAuth, profileController.profile);
router.get("/userProfile",userAuth, profileController.loadUserProfile);
router.put("/updateProfile",userAuth,profileController.changeProfile);
router.get("/product-details",productController.productDetails);

//address
router.get("/loadAddAddress",userAuth,profileController.loadAddress);
router.get("/addAddress",userAuth,profileController.addAddres);
router.post("/addAddress",userAuth,profileController.addAAddress);
router.get("/editAddress/:id",userAuth,profileController.editAddress);
router.post("/editAddress",userAuth,profileController.updateAddress);
router.delete("/deleteAddress/:id",userAuth,profileController.deleteAddress)

//cart Manegement
router.get('/cart', userAuth, cartController.loadCart);
router.post('/add-to-cart/:productId', userAuth, cartController.addToCart);
router.patch('/increment/:itemId',userAuth,cartController.increaseQuantity); 
router.patch('/decrement/:itemId',userAuth,cartController.decreaseQuantity);
router.post('/remove/:itemId', userAuth, cartController.removeItem);


//checkout management
router.get("/checkout", userAuth, orderController.getCheckoutPage);
router.post("/create-order", userAuth, orderController.createOrder);
router.get("/order-placed", userAuth, orderController.getOrderPlacedPage);
router.post('/handle-payment-failure', userAuth, orderController.handlePaymentFailure);

//order Management
router.get("/orders", userAuth, orderController.orderDetail)
router.get('/order/details/:orderId', userAuth, orderController.getOrderDetails);
router.get('/viewOrder',orderController.viewOrder);
router.post('/cancelOrder',orderController.cancelOrder);
router.post('/return-order', userAuth, orderController.returnOrder);
router.get('/download-invoice', userAuth, orderController.downloadInvoice);
router.post('/retry-payment', userAuth, orderController.retryPayment);
router.post('/verify-payment', userAuth, orderController.verifyPayment);

//coupon side
router.get("/get-available-coupons", userAuth, orderController.getAvailableCoupons);
router.post("/apply-coupon", userAuth, orderController.applyCoupon);

/// Wallet Management 
router.get('/user-wallet', userAuth, walletController.loadWalletPage);
// router.post('/add-money-to-wallet', userAuth, walletController.addMoneyToWallet);
// router.post('/verify-payment', userAuth, walletController.verifyPayment);
router.post('/wallet/add-money', userAuth, walletController.addMoneyToWallet);
router.post('/wallet/verify-payment', userAuth, walletController.verifyPayment);
// Add this to your routes file
router.post('/process-wallet-payment', userAuth, walletController.processWalletPayment);

// wishlist management
router.get("/wishlist", userAuth, wishlistController.getWishlist);
router.post('/wishlist/add', userAuth, wishlistController.addToWishlist);
router.post("/wishlist/remove", userAuth, wishlistController.removeFromWishlist);
router.post('/wishlist/add-to-cart', userAuth, wishlistController.addToCart);
router.get('/wishlist/check-status', wishlistController.checkWishlistStatus);



// Remove userAuth since we want to check status even for non-logged-in users
module.exports = router;