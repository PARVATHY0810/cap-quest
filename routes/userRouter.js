const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/userController");



router.get("/pageNotFound",userController.pageNotFound);
router.get("/",userController.loadHomepage);
router.get("/shop",userController.loadShopPage);






module.exports = router;