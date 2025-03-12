const { query } = require("express");
const Category = require("../../models/categorySchema.js");
const { MongoCryptCreateDataKeyError } = require("mongodb");



const categoryInfo = async (req, res) => {
    try {
        let search = req.query.search || '';
        const page = parseInt(req.query.page) || 1;
        const limit = 3;
        const skip = (page - 1) * limit;

        const categoryData = await Category.find({
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: "i" } },
                { description: { $regex: ".*" + search + ".*", $options: "i" } }
            ]
        })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalCategories = await Category.countDocuments({
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: "i" } },
                { description: { $regex: ".*" + search + ".*", $options: "i" } }
            ]
        });

        const totalPages = Math.ceil(totalCategories / limit);
        
        res.render("category", {
            cat: categoryData,
            currentPage: page,
            totalPages: totalPages,
            totalCategories: totalCategories
        });

    } catch (error) {
        console.error(error);
        res.redirect("/pageError"); 
    }
};


const addCategory = async (req, res) => {
    
    const { name, description } = req.body;
    try {
        if (!name || !description) {
            return res.status(400).json({ error: "Name and description are required" });
        }
        const normalizedName = name.trim().toLowerCase();
        if (!/^[a-zA-Z\s]+$/.test(normalizedName)) {
            return res.status(400).json({ error: "Category name must contain only letters and spaces" });
        }
        const existingCategory = await Category.findOne({ name: normalizedName });
        if (existingCategory) {
            return res.status(400).json({ error: "Category already exists" });
        }
        const newCategory = new Category({
            name: normalizedName,
            description: description.trim(),
        });
        await newCategory.save();
        return res.json({ message: "Category added successfully" });
    } catch (error) {
        console.error("Error adding category:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

const getEditCategory= async (req,res)=>{
    try {
        const id = req.query.id;
        const category= await Category.findOne({_id:id});
        
        res.render("editCategory",{category:category});

    } catch (error) {
        
        res.redirect("/pageerror")
    }
};




const editCategory = async (req, res) => {
    try {
        const id = req.params.id;
        const { categoryName, description } = req.body;

        if (!categoryName || !description) {
            return res.status(400).json({ error: "Name and description are required" });
        }

    
        const existingCategory = await Category.findOne({ 
            name: { $regex: new RegExp(`^${categoryName}$`, 'i') },
            _id: { $ne: id }
        });

        if (existingCategory) {
            return res.status(400).json({ error: "Category exists with a similar name (case-insensitive), please choose another name" });
        }

        const updatedCategory = await Category.findByIdAndUpdate(id, {
            name: categoryName, 
            description: description,
        }, { new: true, runValidators: true });

        if (!updatedCategory) {
            return res.status(404).json({ error: 'Category not found' });
        }

        res.json({ message: 'Category updated successfully' });

    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
}


const getListCategory = async (req, res) => {
    try {
        let id = req.query.id;
        await Category.updateOne({ _id: id }, { $set: { isListed: true } });
        res.json({ success: true, message: "Category unlisted successfully" }); 
    } catch (error) {
        console.error("Error unlisting category:", error);
        res.status(500).json({ success: false, message: "Something went wrong" });
    }
};

const getUnlistCategory = async (req, res) => {
    try {
        let id = req.query.id;
        await Category.updateOne({ _id: id }, { $set: { isListed: false } });
        res.json({ success: true, message: "Category listed successfully" });  
    } catch (error) {
        console.error("Error listing category:", error);
        res.status(500).json({ success: false, message: "Something went wrong" });
    }
};
const addCategoryOffer = async (req, res) => {
    try {
      const { categoryId, offerPercentage, endDate } = req.body;
  
      if (!categoryId || !offerPercentage || !endDate) {
        return res.status(400).json({ error: "All fields are required" });
      }
  
      const category = await Category.findById(categoryId);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
  
      category.categoryOffer = offerPercentage;
      category.offerEndDate = new Date(endDate);
  
      await category.save();
  
      res.json({ message: "Offer added successfully" });
    } catch (error) {
      console.error("Error adding category offer:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  };
  
  const removeCategoryOffer = async (req, res) => {
    try {
      const { categoryId } = req.body;
  
      if (!categoryId) {
        return res.status(400).json({ error: "Category ID is required" });
      }
  
      const category = await Category.findById(categoryId);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
  
      category.categoryOffer = 0;
      category.offerEndDate = null;
  
      await category.save();
  
      res.json({ message: "Offer removed successfully" });
    } catch (error) {
      console.error("Error removing category offer:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  };

module.exports ={
    categoryInfo,
    addCategory,
    getEditCategory,
    editCategory,
    getListCategory,
    getUnlistCategory,
    addCategoryOffer,
    removeCategoryOffer
};