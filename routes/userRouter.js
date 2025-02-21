const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/userController");
const passport = require("passport");
const { userAuth } = require("../middlewares/auth");
const Product = require("../models/productSchema");
const profileController = require("../controllers/user/profileController")
const productController = require("../controllers/user/productController")
//const cartController = require('../../controllers/cartController');



router.get("/pageNotFound",userController.pageNotFound);
router.get("/",userController.loadHomepage);
// router.get("/",userController.loadHomepage);
router.get("/shop",userController.loadShopPage);
router.get("/signup",userController.loadSignupPage);
router.post("/signup",userController.signup);
router.get('/verify-otp',userController.loadOtp);
router.post("/verify-otp",userController.verifyOtp);
router.post("/resend-otp", userController.resendOtp);



router.get("/auth/google",passport.authenticate("google", { scope: ["profile", "email"] }));
router.get("/auth/google/callback",passport.authenticate("google", { failureRedirect: "/signup" }),(req,res)=>{res.redirect("/");});
router.get("/login",userController.loadLogin);
router.post("/login",userController.login);

router.get("/forgot-password", userController.forgotPasssword)
router.post("/reset-password", userController.forgotPassswordSendLink);
router.get("/new-password", userController.newPassword)
router.post("/new-password",userController.changePassword)
router.get("/productdetails",userController.CapProductDetails)
// router.get('/',userController.loadHomepage);
router.get("/logout",userController.logout);
//profile Management
router.get("/product-details",productController.productDetails);
router.get("/profile", userAuth, profileController.profile);
router.get("/userProfile",userAuth, profileController.loadUserProfile);
router.put("/updateProfile",userAuth,profileController.changeProfile);
router.get("/loadAddAddress",userAuth,profileController.loadAddress);
router.get("/addAddress",userAuth,profileController.addAddres);
router.post("/addAddress",userAuth,profileController.addAAddress);
router.get("/editAddress/:id",userAuth,profileController.editAddress);
router.post("/editAddress",userAuth,profileController.updateAddress);
router.delete("/deleteAddress/:id",userAuth,profileController.deleteAddress)
//


module.exports = router;