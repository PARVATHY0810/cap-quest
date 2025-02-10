 const Product = require("../../models/productSchema");
 const Category = require("../../models/categorySchema");
 const Brand = require("../../models/brandSchema");
 const User = require("../../models/userSchema");
 const fs = require("fs");
 const path = require("path");
 const sharo = require("sharp");




 const getProductAddPage = async (req,res)=>{
  try {
    const category = await Category.find({isListed:true});
    const brand = await Brand.find({isBlocked:false});
    res.render("product-add",{
      cat:category,
      brand:brand
    });
  } catch (error) {
    res.redirect("/pageerror")
  }
 };

 // Add Product
const addProducts = async (req, res) => {
  try {
    console.log(req.files)
      const products = req.body;

      // Check if product already exists
      const productExists = await Product.findOne({ productName: products.productName });

      if (!productExists) {
          const images = [];

          if (req.files && req.files.length > 0) {
               const uploadDir = path.join(__dirname, "../../public/uploads/re-images");

             

              // // Resize and save images
              // for (let i = 0; i < req.files.length; i++) {
              //     const originalImagePath = req.files[i].path;
              //     //const resizedImagePath = path.join(uploadDir, req.files[i].filename);
              //     const resizedImagePath = path.join('public','uploads','product-images',req.files[i].filename)

              //     await sharp(originalImagePath)
              //         .resize({ width: 440, height: 440 })
              //         .toFile(resizedImagePath);

              //     images.push(req.files[i].filename);
              // }


              for (let i = 0; i < req.files.length; i++) {
                 images.push(`/uploads/re-images/${req.files[i].filename}`)
               

           

                  // try {
                  //     await sharp(originalImagePath)
                  //         .resize({ width: 440, height: 440 })
                  //         .jpeg({ quality: 80 }) // Convert to JPEG format
                  //         .toFile(resizedImagePath);
                      
                  //     images.push(resizedImageName);
                  // } catch (sharpError) {
                  //     console.error("Sharp processing error:", sharpError);
                  // }
              }
              console.log(images)


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
              color:products.color,
              productImage: images,
              status: "Available",
          });

          await newProduct.save();
          return res.redirect("/admin/addProducts");
      } else {
          return res.status(400).json({ error: "Product already exists, please try with another name" });
      }
  } catch (error) {
      console.error("Error saving product:", error);
      return res.redirect("/admin/pageerror");
  }
};


const getAllProducts = async(req,res)=>{
  try {
    
      const search = req.query.search || ""
      const page = req.query.page || 1
      const limit =4; 
      const productData = await Product.find({
          $or:[

              {productName :{$regex :new RegExp(".* "+search +".*","i")}},
              {brand :{$regex :new RegExp(".*"+search +".*","i")}},

          ],
      })
      .limit(limit*1).skip((page-1)*limit).populate('category').exec()

      const count = await Product.find({
          $or:[
              {productName :{$regex :new RegExp(".*"+search+".*","i")}},
              {brand:{$regex: new RegExp(".*"+search+".*","i")}},
          ],
      }).countDocuments()


      const category = await Category.find({isListed:true})
      const brand = await Brand.find({isBlocked: false})

      if(category && brand){
          res.render("products",{
              data:productData,
              currentPage : page,
              totalPages : Math.ceil(count/limit),
              cat : category,
              brand : brand,


          })
      }
else{
  res.render("page-404 ")

}

  } catch (error) {
      res.redirect("/pageerror")
  }
}

const blockProduct = async (req,res)=>{
  console.log("block ethi");
  try {
    let id = req.query.id;
    await Product.updateOne({_id:id},{$set:{isBlocked:true}});
    res.redirect("/admin/products");

  } catch (error) {
    res.redirect("/pageerror")
  }
}

const unblockProduct = async (req,res)=>{
  console.log("unblock ethi");
  try {
    let id = req.query.id;
    await Product.updateOne({_id:id},{$set:{isBlocked:false}});
    res.redirect("/admin/products");

  } catch (error) {
    res.redirect("/pageerror")
  }
}

const getEditProduct = async (req,res)=>{
  try {
    const id = req.query.id;
    const product = await Product.findOne({_id:id});
    const category = await Category.find({});
    const brand = await Brand.find({});
    res.render("edit-product",{
      product:product,
      cat:category,
      brand:brand,
    })
  } catch (error) {
    res.redirect("/pageerror")
    
  }
}

const editProduct = async (req,res)=>{
  try {
    const id = req.params.id;
    const product = await Product.findOne({_id:id});
    const data = req.body;
    const existinProduct = await Product.findOne({
      productName:data.productName,
      _id:{$ne:id}
    })
    if(existingProduct){
      return res.status(400).json({error:"Product with this name is already exists.Plese try with another name"})
    }
   const images = [];
   if(req.files && req.files.length>0){
    for(let i=0;i<req.files.length;i++){
      images.push(req.files[i].filename);
    }
   }

   const updateFieids = {
    productName:data.productName,
    description: data.description,
    brand: data.brand,
    category: product.categoryId,
    regularPrice: data.regularPrice,
    salePrice: data.salePrice,
    quantity: data.quantity,
    size: data.size,
    color:data.color,
    
  }
   if(req.files.length>0){
    updateFields.$push ={productImage:{$each:images}};
   }

   await Product.findByIdAndUpdate(id,updateFields,{new:true});
   res.redirect("/admin/products");

  } catch (error) {
    console.log(error);
    res.redirect("/pageerror")
  }
}

const deleteSingleImage = async (req,res) => {
  try {
    const {imageNameToServer,productIdToServer}= req.body;
    const product = await Product.findByIdAndUpdate(productIdToServer,{$pull:{productImage:imageNameToServer}});
    const imagePath = path.join("public","uploads","re-image",imageNameToServer);
    if(fs.existsSync(imagePath)){
      await fs.unlinkSync(imagePath);
      console.log(`Image${imageNameToServer} deleted successfully`);

    }else{
      console.log(`Image ${imageNameToServer} not found `); 
    }
    res.send({status:true})


  } catch (error) {
    res.redirect("/pageerror")
  }
}
module.exports = { getProductAddPage,
                  addProducts ,
                  getAllProducts,
                  blockProduct,
                  unblockProduct,
                  getEditProduct,
                  editProduct,
                  deleteSingleImage,


};

 