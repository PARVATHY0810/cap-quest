const express = require('express'); 
const adminController = require('../controllers/admin/adminController');
const router = express.Router();
const customerController = require("../controllers/admin/customercontroller");
const categoryController = require("../controllers/admin/categoryController");
const brandController = require("../controllers/admin/brandController")
const productController = require("../controllers/admin/productController");
const orderController = require("../controllers/admin/orderController")
const {userAuth,adminAuth} = require("../middlewares/auth");
const multer = require("multer");
//const storage =require("../helpers/multer");
const uploads = require("../helpers/multer")
//const {uploads} =multer({storage:storage});


router.get("/pageerror",adminController.pageerror);
//Login Management
router.get("/login",adminController.loadlogin); 
router.post("/login",adminController.login);
// router.get("/",adminController.loadDashboard)
// router.get("/",adminAuth,adminController.loadDashboard);
router.get("/dashboard",adminAuth,adminController.loadDashboard)
router.get("/logout",adminController.logout);

//custum manager
router.get("/users",adminAuth,customerController.customerInfo)
router.get("/blockCustomer",adminAuth,customerController.customerBlocked);
router.get("/unblockCustomer",adminAuth,customerController.customerunBlocked);

//category Management
router.get("/category",adminAuth,categoryController.categoryInfo)
router.post("/addCategory",adminAuth,categoryController.addCategory)
router.get("/unlistCategory",adminAuth,categoryController.getUnlistCategory);
router.get("/listCategory",adminAuth,categoryController.getListCategory);
router.get("/editCategory",adminAuth,categoryController.getEditCategory)
router.post("/editCategory",adminAuth,categoryController.getEditCategory);
router.post("/editCategory/:id",adminAuth,categoryController.editCategory)

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



router.get('/orderlist',adminAuth,orderController.getOrders)
router.get("/orderdetails/:orderId", adminAuth, orderController.getOrderDetails);
router.post("/orders/update-status/:itemId", adminAuth, orderController.changeStatus);

module.exports = router;