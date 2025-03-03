const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const Address = require('../../models/addressSchema');
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;



const getCheckoutPage = async (req, res) => {
  try {
    const userId = req.session.user;  
    const userData = userId ? await User.findById(userId) : null;
    //console.log("user in checkout:    ",userData);

    const cartItems = await Cart.find({ userId }).populate("productId");
    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ message: "No items in cart" });
    }
    let subtotal = 0;
    cartItems.forEach((item) => {
      subtotal += item.price;
    });
    const cartId = cartItems[0]._id; // Assuming one cart or aggregating items

    // Fetching 
    const addresses = await Address.find({ userId });
    if (!addresses) {
      console.log("No addresses found for user:", userId);
    }

    res.render("checkout", {
      userData,
      cart: cartItems,
      addresses: addresses || [], 
      total: subtotal,
      cartId: cartId,
      userId: userId,
    });
  } catch (error) {
    console.error("Error fetching checkout page:", error);
    res.status(500).json({ message: "Server error" });
  }
};




const createOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    const { addressId, cartId, paymentMethod, finalAmount } = req.body;

    // Fetch the selected address
    const address = await Address.findById(addressId);
    if (!address) {
      return res.status(400).json({ success: false, message: "Invalid address" });
    }

    // Fetch the cart and populate product details
    const cartItems = await Cart.find({ userId }).populate("productId");
    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ success: false, message: "Cart not found" });
    }
    
    
    const orderedItems = cartItems.map(item => ({
      product: item.productId._id,
      quantity: item.quantity,
      price: item.price
    }));
    
    
    const totalPrice = cartItems.reduce((sum, item) => sum + item.price, 0);

    
    const order = new Order({
      userId,
      orderedItems,
      totalPrice,
      finalAmount,
      shippingAddress: {
        fullName: address.name,
        addressType: address.addressType,
        landmark: address.landMark,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        phone: address.phone,
      },
      paymentMethod: paymentMethod.toLowerCase(),
      orderDate: new Date(),
      deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: paymentMethod === "COD" ? "Pending COD" : "Pending",
      discount: 0,
      shippingCharge: 0
    });

    
    const savedOrder = await order.save();

    
    for (const item of orderedItems) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(400).json({ success: false, message: `Product with ID ${item.product} not found` });
      }
      if (product.quantity < item.quantity) {
        return res.status(400).json({ success: false, message: `Insufficient stock for ${product.productName}` });
      }
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { quantity: -item.quantity } },
        { new: true }
      );
    }

    
    await Cart.deleteMany({ userId });

    
    res.status(200).json({ success: true, orderId: savedOrder._id });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getOrderPlacedPage = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = userId ? await User.findById(userId) : null;
    console.log("Userdata",userData)
    const orderId = req.query.orderId; // Get orderId from query params

    const order = await Order.findById(orderId).populate("orderedItems.product");
    if (!order) {
      return res.status(404).send("Order not found");
    }

    res.render("order-placed", { order, userData: userData });
  } catch (error) {
    console.error("Error rendering order-placed page:", error);
    res.status(500).send("Server error");
  }
};


const orderDetail = async (req, res) => {
  try {
    const userId = req.session.user;

    
    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    
    const userData = await User.findById(userId);

    if (!userData) {
      return res.status(404).json({ message: "User not found" });
    }

    
    const orders = await Order.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      { $match: { userId: new ObjectId(userId) } },
    ]);

    const formattedOrders = orders.map(order => ({
      _id: order._id,
      Date: order.orderDate.toLocaleDateString(), // Format the date
      userDetails: order.userDetails[0], // Assuming userDetails is an array with one element
      finalAmount: order.finalAmount
    }));


    res.render("orders", { orders:formattedOrders, userData });
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const viewOrder = async (req, res) => {
  try {
    const orderId = req.query.orderId;
    
   
    const orders = await Order.find({ _id: orderId })
      .populate("orderedItems.product")
      .populate("userId");
    
    if (!orders || orders.length === 0) {
      return res.status(404).send("Order not found");
    }

    // Format data to match template expectations
    const formattedOrders = [{
      _id: orders[0]._id,
      Date: orders[0].orderDate.toLocaleDateString(), 
      orderItems: orders[0].orderedItems.map(item => ({
        _id: item._id,
        productName: item.product ? item.product.productName : 'Product Name Not Available',
        productImage: item.product ? item.product.productImage[0] : 'default.jpg',
        quantity: item.quantity,
        price: item.price,
        orderStatus: item.status 
      })),
      
      address: {
        name: orders[0].shippingAddress.fullName,
        phone: orders[0].shippingAddress.phone,
        addressType: orders[0].shippingAddress.addressType,
        city: orders[0].shippingAddress.city,
        landmark: orders[0].shippingAddress.landmark,
        state: orders[0].shippingAddress.state,
        pincode: orders[0].shippingAddress.pincode
      }
    }];

    // Calculating the total price
    const Totalprice = orders[0].orderedItems.reduce((sum, element) => {
      return sum + element.quantity * element.price;
    }, 0);

    console.log("Total Price:", Totalprice);

    
    const userData = req.session.user || null;

    res.render("view-allorder", { 
      orders: formattedOrders, 
      Totalprice, 
      userData 
    });

  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).send("Server Error");
  }
};

const getOrderDetails = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = userId ? await User.findById(userId) : null;
    const orderId = req.params.orderId;

    
    const order = await Order.findOne({ orderId })
      .populate({
        path: 'orderedItems.product',
        select: 'productName productImage'
      });

    if (!order) {
      return res.status(404).render('page-404', { 
        message: 'Order not found',
        userData,
        user: req.session.user
      });
    }

    console.log('Order Details:', JSON.stringify(order, null, 2)); // Debugging log

    res.render('order-details', {
      order, 
      userData,
      user: req.session.user
    });

  } catch (error) {
    console.error('Error fetching order details:', error); // Debugging log
    res.status(500).json({ message: 'Server error' });
  }
};



const cancelOrder = async (req, res) => {
  try {
    console.log(req.body);
    const { orderId, productId } = req.body;
    console.log("hai:", orderId, productId);

    // Find the order
    const order = await Order.findOne({ _id: orderId });
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Update the order status
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: orderId, "orderedItems._id": productId },
      { $set: { "orderedItems.$.status": "Cancelled" } },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(400).json({ error: "Order update failed" });
    }

    
    const cancelledItem = order.orderedItems.find(item => item._id.toString() === productId);
    if (cancelledItem) {
      await Product.findByIdAndUpdate(
        cancelledItem.product,
        { $inc: { quantity: cancelledItem.quantity } }
      );
    }

    return res.json({ success: "Successfully cancelled" });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};



module.exports = {
  getCheckoutPage,
  createOrder,
  getOrderPlacedPage,
  getOrderDetails,
  orderDetail,
  viewOrder,
  cancelOrder
};