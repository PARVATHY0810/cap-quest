const mongoose = require("mongoose");
const User = require("../../models/userSchema");
const bcrypt = require("bcrypt");
const Category = require("../../models/categorySchema");
const Address = require("../../models/addressSchema");
const Brand = require("../../models/brandSchema");
const Product = require("../../models/productSchema");
const Order = require("../../models/orderSchema");
// const order = await Order.findOne({ "orderedItems._id": item });
// const item = order.orderedItems.id(item);





const getOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 7;

       
        const orders = await Order.find()
            .populate("orderedItems.product") 
            .populate("userId") 
            .sort({ createdAt: -1 }) 
            .skip((page - 1) * limit)
            .limit(limit);
            console.log(orders)

        const count = await Order.countDocuments();
        const totalpage = Math.ceil(count / limit);




        console.log(orders.map(order => order.orderedItems));
        console.log(orders.map(order => order.orderedItems.map(item => item.orderStatus)));

        
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
  
      const overallStatus = order.orderedItems.every(item => item.orderStatus === "delivered")
        ? "delivered"
        : order.orderedItems.some(item => item.orderStatus === "processing" || item.orderStatus === "shipped")
          ? "processing"
          : "pending";
  
      // Define userData with admin check
      const userData = req.session?.user || req.user || null;
      // Assuming your User model has an `isAdmin` or `role` field
      const isAdmin = userData ? await User.findById(userData._id).select("isAdmin") : false;
  
      res.render("orderDetails", {
        order,
        overallStatus,
        specificAddress: order.address,
        user: order.userId || null,
        userData: { ...userData, isAdmin: isAdmin?.isAdmin || userData?.role === "admin" } // Adjust based on your schema
      });
  
    } catch (error) {
      console.error("Error fetching order details:", error);
      res.status(500).json({ error: "Failed to fetch order details" });
    }
  };

  const changeStatus = async (req, res) => {
    try {
      const { itemId } = req.params;
      const { status,orderId } = req.body;

      console.log(req.body);
      const a = await Order.findOne({ _id: orderId, "orderedItems._id": itemId });
      console.log(a);
      await Order.updateOne(
        { _id: orderId, "orderedItems._id": itemId },
        { $set: { "orderedItems.$.status":status} } 
      );
      console.log("sucesses");

    } catch (error) {
      console.error("Error in changeStatus:", error);
      return res.status(500).json({ success: false, error: "Failed to update order status" });
    }
  };



  module.exports  = {

    getOrders,
    getOrderDetails,
    changeStatus
  }