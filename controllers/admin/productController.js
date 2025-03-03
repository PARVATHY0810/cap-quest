const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const User = require("../../models/userSchema");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const getProductAddPage = async (req, res) => {
  try {
    const category = await Category.find({ isListed: true });
    const brand = await Brand.find({ isBlocked: false });
    res.render("product-add", {
      cat: category,
      brand: brand,
    });
  } catch (error) {
    res.redirect("/pageerror");
  }
};

// Add Product
const addProducts = async (req, res) => {
  try {
    console.log(req.files);
    const products = req.body;

    // Check if product already exists
    const productExists = await Product.findOne({
      productName: products.productName,
    });

    if (!productExists) {
      const images = [];

      if (req.files && req.files.length > 0) {
        const uploadDir = path.join(
          __dirname,
          "../../public/uploads/re-images"
        );

       
        for (let i = 0; i < req.files.length; i++) {
          images.push(`${req.files[i].filename}`);

        }
        console.log(images);
      }

      // Find the category ID
      const categoryId = await Category.findOne({ name: products.category });
      if (!categoryId) {
        return res.status(400).json({ error: "Invalid category name" });
      }

      // Create new product
      const newProduct = new Product({
        productName: products.productName,
        description: products.description,
        brand: products.brand,
        category: categoryId._id,
        regularPrice: products.regularPrice,
        salePrice: products.salePrice,
        createdOn: new Date(),
        quantity: products.quantity,
        size: products.size,
        color: products.color,
        productImage: images,
        status: "Available",
      });

      await newProduct.save();
      return res.redirect("/admin/addProducts");
    } else {
      return res
        .status(400)
        .json({
          error: "Product already exists, please try with another name",
        });
    }
  } catch (error) {
    console.error("Error saving product:", error);
    return res.redirect("/admin/pageerror");
  }
};

const getAllProducts = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = req.query.page || 1;
    const limit = 4;
    const productData = await Product.find({
      $or: [
        { productName: { $regex: new RegExp(".* " + search + ".*", "i") } },
        { brand: { $regex: new RegExp(".*" + search + ".*", "i") } },
      ],
    })
      .select("productName brand category regularPrice salePrice quantity productImage isBlocked") // Explicitly select fields including productImage
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 })
      .populate("category")
      .exec();

    const count = await Product.find({
      $or: [
        { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
        { brand: { $regex: new RegExp(".*" + search + ".*", "i") } },
      ],
    }).countDocuments();

    const category = await Category.find({ isListed: true });
    const brand = await Brand.find({ isBlocked: false });

    if (category && brand) {
      res.render("products", {
        data: productData,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        cat: category,
        brand: brand,
      });
    } else {
      res.render("page-404");
    }
  } catch (error) {
    res.redirect("/pageerror");
  }
};

const blockProduct = async (req, res) => {
  console.log("block");

  try {
    let id = req.query.id;
    console.log(id);
    await Product.updateOne({ _id: id }, { $set: { isBlocked: true } });
    res.redirect("/admin/products");
  } catch (error) {
    res.redirect("/pageerror");
  }
};

const unblockProduct = async (req, res) => {
  try {
    let id = req.query.id;
    await Product.updateOne({ _id: id }, { $set: { isBlocked: false } });
    res.redirect("/admin/products");
  } catch (error) {
    res.redirect("/pageerror");
  }
  console.log(req.query.id);
};

const getEditProduct = async (req, res) => {
  try {
    const id = req.query.id;
    const product = await Product.findOne({ _id: id });
    const category = await Category.find({});
    const brand = await Brand.find({});
    res.render("edit-product", {
      product: product,
      cat: category,
      brand: brand,
    });
  } catch (error) {
    res.redirect("/pageerror");
  }
};


const editProduct = async (req, res) => {
  try {
    const id = req.params.id;
    const product = await Product.findOne({ _id: id });

    if (!product) {
      return res.redirect("/pageerror");
    }

    const data = req.body;

    // Check for duplicate product name
    const existingProduct = await Product.findOne({
      productName: data.productName,
      _id: { $ne: id },
    });

    if (existingProduct) {
      return res.redirect("/admin/products?error=duplicate");
    }

    // Handle image replacement at specific positions
    let updatedImages = [...product.productImage];

    if (req.files && req.files.length > 0) {
      const replacePositions = Array.isArray(req.body.replace_position)
        ? req.body.replace_position
        : [req.body.replace_position];

      for (let i = 0; i < req.files.length; i++) {
        const position = parseInt(replacePositions[i]);
        const resizedImagePath = path.join(
          __dirname,
          "../../public/uploads/re-image",
          `resized-${req.files[i].filename}`
        );

        await sharp(req.files[i].path)
          .resize(600, 600, { fit: "cover" })
          .toFile(resizedImagePath);

        if (position < updatedImages.length) {
          const oldImagePath = path.join(
            __dirname,
            "../../public/uploads/re-image",
            updatedImages[position]
          );
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
          updatedImages[position] = `resized-${req.files[i].filename}`;
        } else {
          updatedImages.push(`resized-${req.files[i].filename}`);
        }
      }
    }

    // Fields to update
    const updateFields = {
      productName: data.productName,
      description: data.descriptionData,
      brand: data.brand,
      category: data.category,
      regularPrice: data.regularPrice,
      salePrice: data.salePrice,
      quantity: data.quantity,
      color: data.color,
      productImage: updatedImages,
    };

    await Product.findByIdAndUpdate({ _id: id }, updateFields, { new: true });

    
    return res.redirect("/admin/products?success=true");
  } catch (error) {
    console.error(error);
    return res.redirect("/pageerror");
  }
};
const deleteSingleImage = async (req, res) => {
  try {
    const { imageNameToServer, productIdToServer, positionToServer } = req.body;
    
    // Find the product and remove the image from the array
    const product = await Product.findById(productIdToServer);
    if (!product) {
      return res.send({ status: false, message: "Product not found" });
    }
    
    // Remove the image from the array
    if (product.productImage && product.productImage.length > 0) {
      product.productImage.splice(positionToServer, 1);
      await product.save();
    }
    
    
    const imagePath = path.join(
      __dirname,
      "../../public/uploads/re-image",
      imageNameToServer
    );
    
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
      console.log(`Image ${imageNameToServer} deleted successfully`);
    } else {
      console.log(`Image ${imageNameToServer} not found in filesystem`);
    }
    
    return res.send({ status: true });
  } catch (error) {
    console.error("Error deleting image:", error);
    return res.send({ status: false, message: error.message });
  }
};
module.exports = {
  getProductAddPage,
  addProducts,
  getAllProducts,
  blockProduct,
  unblockProduct,
  getEditProduct,
  editProduct,
  deleteSingleImage,
};
