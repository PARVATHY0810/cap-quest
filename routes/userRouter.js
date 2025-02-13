const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/userController");
const passport = require("passport");
const { userAuth } = require("../middlewares/auth");
const Product = require("../models/productSchema");
const productController = require("../controllers/user/productController")


router.get("/pageNotFound",userController.pageNotFound);
router.get("/",userController.loadHomepage);
// router.get("/",userController.loadHomepage);
router.get("/shop",userController.loadShopPage);
router.get("/signup",userController.loadSignupPage);
router.post("/signup",userController.signup);
router.get('/verify-otp',userController.loadOtp);
router.post("/verify-otp",userController.verifyOtp);
router.post("/resend-otp", userController.resendOtp);



router.get(
  "/auth/google",passport.authenticate("google", { scope: ["profile", "email"] })
);
router.get(
  "/auth/google/callback",passport.authenticate("google", { failureRedirect: "/signup" }),
  (req,res)=>{
  res.redirect("/");
});
router.get("/login",userController.loadLogin);
router.post("/login",userController.login);

// router.get('/',userController.loadHomepage);
router.get("/logout",userController.logout);

//product Management
router.get("/product-details",productController.productDetails);



module.exports = router;