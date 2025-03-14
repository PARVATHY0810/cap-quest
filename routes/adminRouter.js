const express = require('express'); 
const router = express.Router();
const adminController = require("../controllers/admin/adminController");
const dashboardController = require("../controllers/admin/dashboardController");
const customerController = require("../controllers/admin/customercontroller");
const categoryController = require("../controllers/admin/categoryController");
const brandController = require("../controllers/admin/brandController")
const productController = require("../controllers/admin/productController");
const orderController = require("../controllers/admin/orderController")
const couponController = require("../controllers/admin/couponController");
const {userAuth,adminAuth} = require("../middlewares/auth");
const multer = require("multer");
const uploads = require("../helpers/multer")

//Login Management
router.get("/pageerror",adminController.pageerror);
router.get("/login",adminController.loadlogin); 
router.post("/login",adminController.login);
router.get("/logout",adminController.logout);

//customer management
router.get("/users",adminAuth,customerController.customerInfo)
router.get("/blockCustomer",adminAuth,customerController.customerBlocked);
router.get("/unblockCustomer",adminAuth,customerController.customerunBlocked);

//category Management
router.get("/category",adminAuth,categoryController.categoryInfo)
router.post("/addCategory", adminAuth, categoryController.addCategory);
router.get("/unlistCategory",adminAuth,categoryController.getUnlistCategory);
router.get("/listCategory",adminAuth,categoryController.getListCategory);
router.get("/editCategory",adminAuth,categoryController.getEditCategory)
router.post("/editCategory",adminAuth,categoryController.getEditCategory);
router.post("/editCategory/:id", adminAuth, categoryController.editCategory);
router.post("/addCategoryOffer", adminAuth, categoryController.addCategoryOffer);
router.post("/removeCategoryOffer", adminAuth, categoryController.removeCategoryOffer);

//dashboard Management
router.get("/dashboard", adminAuth, dashboardController.loadDashboard);
router.get("/category-data", adminAuth, dashboardController.getCategoryData);
router.get("/brand-data", adminAuth, dashboardController.getBrandData);
router.get("/download-report", adminAuth, dashboardController.downloadReport);
router.get("/chart-data", adminAuth, dashboardController.getChartData);


//Brand Management
router.get("/brands",adminAuth,brandController.getBrandPage);
router.post("/addBrand", adminAuth, uploads.single("image"), brandController.addBrand)
router.get("/blockBrand",adminAuth,brandController.blockBrand);
router.get("/unBlockBrand",adminAuth,brandController.unBlockBrand);
router.get("/deleteBrand",adminAuth,brandController.deletBrand);

//product Management
router.get("/addProducts",adminAuth,productController.getProductAddPage)
router.post("/addProducts",adminAuth,uploads.array("images",4),productController.addProducts);
router.get("/products",adminAuth,productController.getAllProducts)
router.get("/blockProduct",adminAuth,productController.blockProduct);
router.get("/unblockProduct",adminAuth,productController.unblockProduct);
router.get("/editProduct",adminAuth,productController.getEditProduct);
router.post("/editProduct/:id",adminAuth,uploads.array("images",4),productController.editProduct)
router.post("/deleteImage",adminAuth,productController.deleteSingleImage);
router.post("/addProductOffer", adminAuth, productController.addProductOffer);
router.post("/removeProductOffer", adminAuth, productController.removeProductOffer);

//ordermanegement
router.get('/orderlist',adminAuth,orderController.getOrders)
router.get("/orderdetails/:orderId", adminAuth, orderController.getOrderDetails);
router.post("/orders/update-status/:itemId", adminAuth, orderController.changeStatus);

/// coupon Mamagement
router.get("/coupons", adminAuth, couponController.getCouponPage);
router.post("/coupons", adminAuth, couponController.addCoupon);
router.post("/toggle-coupon/:couponId", adminAuth, couponController.toggleCouponStatus);
router.get("/coupons/:couponId", adminAuth, couponController.getCouponById);
router.put("/coupons/:couponId", adminAuth, couponController.updateCoupon);
router.delete("/coupons/:couponId", adminAuth, couponController.deleteCoupon);


module.exports = router;