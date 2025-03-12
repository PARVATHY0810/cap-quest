const mongoose = require("mongoose");
const User = require("../../models/userSchema");
const bcrypt = require("bcrypt");
const Category = require("../../models/categorySchema");
const Address = require("../../models/addressSchema");
const Brand = require("../../models/brandSchema");
const Product = require("../../models/productSchema");
const Order = require("../../models/orderSchema");

const getOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 7;

        console.log('this is page',page)
        console.log('this is limit',limit)

       
        const orders = await Order.find()
        .populate("orderedItems.product") 
        .populate("userId") 
        .sort({ createdOn: -1 })
        .skip((page - 1) * limit)
        .limit(limit);
    

            

        const count = await Order.countDocuments();
        const totalpage = Math.ceil(count / limit);

      console.log('this is count',count)
      console.log('this is totalpage',totalpage)

        // console.log(orders.map(order => order.orderedItems));
        // console.log(orders.map(order => order.orderedItems.map(item => item.orderStatus)));

        
        res.render("orderlist", { 
            orders,
            currentpage: page,
            totalpage: totalpage,
        });
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: "Error while getting orders" });
    }
};

const getOrderDetails = async (req, res) => {
    try {
      const { orderId } = req.params;
  
      const order = await Order.findById(orderId)
        .populate("userId", "firstName lastName phone email")
        .populate("orderedItems.product", "productName price productImage");
  
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
  
      const overallStatus = order.orderedItems.every(item => item.status === "Delivered")
        ? "Delivered"
        : order.orderedItems.some(item => item.status === "Processing" || item.status === "Shipped")
          ? "Processing"
          : "Pending";
  
      
      const userData = req.session?.user || req.user || null;
      
      const isAdmin = userData ? await User.findById(userData._id).select("isAdmin") : false;
  
      res.render("orderDetails", {
        order,
        overallStatus,
        specificAddress: order.address,
        user: order.userId || null,
        userData: { ...userData, isAdmin: isAdmin?.isAdmin || userData?.role === "admin" }
      });
  
    } catch (error) {
      console.error("Error fetching order details:", error);
      res.status(500).json({ error: "Failed to fetch order details" });
    }
  };
  const changeStatus = async (req, res) => {
    try {
      const { itemId } = req.params;
      const { status, orderId, adminResponse } = req.body;
  
      console.log("Update request received:", { itemId, status, orderId, adminResponse });
  
      if (!mongoose.Types.ObjectId.isValid(orderId) || !mongoose.Types.ObjectId.isValid(itemId)) {
        return res.status(400).json({ success: false, message: "Invalid order or item ID" });
      }
  
      const updateFields = { "orderedItems.$.status": status };
      if (adminResponse) {
        updateFields["orderedItems.$.adminResponse"] = adminResponse;
      }
  
      const result = await Order.updateOne(
        { _id: orderId, "orderedItems._id": itemId },
        { $set: updateFields }
      );
  
      console.log("Update result:", result);
  
      if (result.matchedCount === 0) {
        return res.status(404).json({ success: false, message: "Order item not found" });
      }
  
      return res.status(200).json({
        success: true,
        message: "Order status updated successfully to " + status
      });
  
    } catch (error) {
      console.error("Error in changeStatus:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update order status: " + error.message
      });
    }
  };

  module.exports = {
    getOrders,
    getOrderDetails,
    changeStatus
  }