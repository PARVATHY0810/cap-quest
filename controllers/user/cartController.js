const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const mongoose=require('mongoose')
const ObjectId=mongoose.Types.ObjectId

const loadCart = async (req, res) => {
    try {
        const userId = req.session.user;
        const itemsPerPage = 4;
        const page = parseInt(req.query.page) || 1;

        const userData = userId ? await User.findById(userId) : null;

        const cart = await Cart.findOne({ userId }).populate({
            path: "productId",
            populate: [
                { path: "category", select: "name isListed categoryDiscount" },
                { path: "brand", select: "name isListed brandDiscount" }
            ]
        });

        if (cart ) {
            const totalItems=await Cart.countDocuments({userId:userId})
            const totalItemss=await Cart.aggregate([{$match:{userId:new ObjectId(userId)}},{
                $lookup:{
                    from:"products",
                    localField:"productId",
                    foreignField:"_id",
                    as:"productDetails"
                }
            }])
            const totalPrice=totalItemss.reduce((sum,num)=>{
                return sum+=num.totalPrice
            },0)
            const totalPages = Math.ceil(totalItems / itemsPerPage);
            const startIndex = (page - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            console.log(totalItemss)
            console.log(totalPrice)

            // const paginatedItems = validItems.slice(startIndex, endIndex);
            // const paginatedCart = {
            //     ...cart.toObject(),
            //     items: paginatedItems
            // };

            // if (validItems.length !== cart.items.length) {
            //     cart.items = validItems;
            //     await cart.save();
            // }

            res.render('cart', {
                userData: userData,
                cart: totalItemss,
                totalPrice: totalPrice,
                message: "Your cart is empty",
                currentPage: 1,
                totalPages: 0
            });
        } else {
            res.render('cart', {
                userData: userData,
                cart: null,
                totalPrice: 0,
                message: "Your cart is empty",
                currentPage: 1,
                totalPages: 0
            });
        }
    } catch (error) {
        console.error("Error loading cart:", error);
        res.status(500).json({ message: "Server error occurred" });  
    }
};

const addToCart = async (req, res) => {
    try {
        const userId = req.session.user;
        const { quantity } = req.body;
        const productId = req.params.productId;

        // First check if product exists
        const productDetails = await Product.findOne({ _id: productId });
        if (!productDetails) {
            return res.status(404).json({ error: "Product not found" });
        }

        // Check if product already exists in user's cart
        const existingCartItem = await Cart.findOne({
            userId: userId,
            productId: productId
        });

        if (existingCartItem) {
            // If product exists, update the quantity and total price
            const newQuantity = existingCartItem.quantity + parseInt(quantity);
            const newTotalPrice = newQuantity * productDetails.salePrice;

            await Cart.findByIdAndUpdate(
                existingCartItem._id,
                {
                    quantity: newQuantity,
                    totalPrice: newTotalPrice
                }
            );

            return res.json({ success: "Cart Updated Successfully" });
        } else {
            // If product doesn't exist, create new cart item
            const newCart = await Cart({
                userId: userId,
                productId: productId,
                quantity: quantity,
                price: productDetails.salePrice,
                totalPrice: quantity * productDetails.salePrice
            });

            await newCart.save();
            return res.json({ success: "Cart Added Successfully" });
        }

    } catch (error) {
        console.log("Error in addToCart controller:", error);
        return res.status(500).json({ error: "Something went wrong" });
    }
};

// In cartController.js

const increaseQuantity = async (req, res) => {
    try {
        const itemId = req.params.itemId;
        const userId = req.session.user;

        const cartItem = await Cart.findOne({ _id: itemId, userId: userId }).populate('productId');

        if (!cartItem) {
            return res.status(404).json({ success: false, message: "Cart item not found" });
        }

        const product = cartItem.productId;

        if (cartItem.quantity >= product.quantity) {
            return res.status(400).json({ success: false, message: "Product stock limit reached" });
        }

        cartItem.quantity += 1;
        cartItem.totalPrice = cartItem.quantity * cartItem.price;
        await cartItem.save();

        // Calculate new cart total
        const allCartItems = await Cart.find({ userId: userId });
        const cartTotal = allCartItems.reduce((sum, item) => sum + item.totalPrice, 0);

        return res.status(200).json({
            success: true,
            message: "Quantity increased",
            data: {
                quantity: cartItem.quantity,
                totalPrice: cartItem.totalPrice,
                cartTotal: cartTotal
            }
        });
    } catch (error) {
        console.error("Cart increment error:", error);
        res.status(500).json({ success: false, message: "An error occurred" });
    }
};

const decreaseQuantity = async (req, res) => {
    try {
        const itemId = req.params.itemId;
        const userId = req.session.user;

        const cartItem = await Cart.findOne({ _id: itemId, userId: userId }).populate('productId');

        if (!cartItem) {
            return res.status(404).json({ success: false, message: "Cart item not found" });
        }

        if (cartItem.quantity <= 1) {
            return res.status(400).json({ success: false, message: "Cannot decrease below 1" });
        }

        cartItem.quantity -= 1;
        cartItem.totalPrice = cartItem.quantity * cartItem.price;
        await cartItem.save();

        // Calculate new cart total
        const allCartItems = await Cart.find({ userId: userId });
        const cartTotal = allCartItems.reduce((sum, item) => sum + item.totalPrice, 0);

        return res.status(200).json({
            success: true,
            message: "Quantity decreased",
            data: {
                quantity: cartItem.quantity,
                totalPrice: cartItem.totalPrice,
                cartTotal: cartTotal
            }
        });
    } catch (error) {
        console.error("Cart decrement error:", error);
        res.status(500).json({ success: false, message: "An error occurred" });
    }
};

const removeItem = async (req, res) => {
    try {
        const cartItemId = req.params.itemId;
        const userId = req.session.user;

        // Find and delete the cart item, ensuring it belongs to the correct user
        const deletedItem = await Cart.findOneAndDelete({ 
            _id: cartItemId,
            userId: userId 
        });

        if (!deletedItem) {
            return res.status(404).json({
                success: false,
                message: "Cart item not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Item removed successfully"
        });

    } catch (error) {
        console.error("Error in removeItem:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

module.exports = {
    loadCart,
    addToCart,
    increaseQuantity,
    decreaseQuantity,
    removeItem
};