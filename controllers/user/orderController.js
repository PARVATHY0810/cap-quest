const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const Address = require('../../models/addressSchema');
const Coupon = require('../../models/couponSchema');
const Wallet = require("../../models/walletSchema");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const Razorpay = require('razorpay');
const PDFDocument = require('pdfkit');




const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});



const getCheckoutPage = async (req, res) => {
  try {
    const userId = req.session.user;  
    const userData = userId ? await User.findById(userId) : null;

    const cartItems = await Cart.find({ userId }).populate("productId");
    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ message: "No items in cart" });
    }
    
    
    for(let i=0; i<cartItems.length; i++){
      if(cartItems[i].productId.isBlocked==true){
        
        return res.render("checkout", {
          userData,
          cart: cartItems,
          addresses: [], 
          total: 0,
          cartId: '',
          userId: userId,
          Coupons: [],
          blockedProduct: true, 
          blockedProductName: cartItems[i].productId.productName 
        });
      }
    }
    
   // console.log(cartItems);
    let subtotal = 0;
    cartItems.forEach((item) => {
      subtotal += item.quantity * item.price;
    });
    const cartId = cartItems[0]._id; 

    // Fetching 
    const addresses = await Address.find({ userId });
    if (!addresses) {
      console.log("No addresses found for user:", userId);
    }

    const Coupons=await Coupon.find({isListed:true,isDeleted:false});
    console.log(Coupons)
    res.render("checkout", {
      userData,
      cart: cartItems,
      addresses: addresses || [], 
      total: subtotal,
      cartId: cartId,
      userId: userId,
      Coupons,
      blockedProduct: false // No blocked products
    });
  } catch (error) {
    console.error("Error fetching checkout page:", error);
    res.status(500).json({ message: "Server error" });
  }
};


const createOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    const { addressId, cartId, paymentMethod, finalAmount, couponCode } = req.body;
    
    if (paymentMethod === "COD" && finalAmount > 5000) {
      return res.status(400).json({ 
        success: false, 
        message: "COD limit 5000 is exceeded, please choose another payment option",
        codLimitExceeded: true
      });
    }

    const address = await Address.findById(addressId);
    if (!address) {
      return res.status(400).json({ success: false, message: "Invalid address" });
    }

    const cartItems = await Cart.find({ userId }).populate("productId");
    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ success: false, message: "Cart not found" });
    }
    
    const orderedItems = cartItems.map(item => ({
      product: item.productId._id,
      quantity: item.quantity,
      price: item.price
    }));
    
    const totalPrice = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // for the calculation of displaed coupn
    let discount = 0;
    let appliedCouponCode = null; 
    if (couponCode) {
      const coupon = await Coupon.findOne({ 
        code: couponCode.toUpperCase(),
        isListed: true,
        isDeleted: false,
        startOn: { $lte: new Date() },
        expireOn: { $gte: new Date() }
      });
      if (coupon && totalPrice >= coupon.minimumPrice) {
        discount = coupon.offerPrice;
        appliedCouponCode = coupon.code; 
        console.log(`Coupon ${appliedCouponCode} applied with discount: ₹${discount}`);
      } else {
        console.log(`Coupon ${couponCode} invalid or not applicable`);
      }
    }

    // orders with using coupn
    const order = new Order({
      userId,
      orderedItems,
      totalPrice,  
      finalAmount: finalAmount || (totalPrice - discount), 
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
      discount: discount,  
      shippingCharge: 0,
      couponApplied: !!appliedCouponCode,
      couponCode: appliedCouponCode 
    });

    const savedOrder = await order.save();
    console.log(`Order saved with couponCode: ${savedOrder.couponCode}`);

    if (paymentMethod === "razorpay") {
      const razorpayOrder = await razorpay.orders.create({
        amount: finalAmount * 100,
        currency: "INR",
        receipt: savedOrder._id.toString(),
      });
      savedOrder.razorpayOrderId = razorpayOrder.id;
      await savedOrder.save();
      
      return res.status(200).json({ 
        success: true, 
        orderId: savedOrder._id, 
        razorpayOrderId: razorpayOrder.id 
      });
    }
    
    for (const item of orderedItems) {
      const product = await Product.findById(item.product);
      if (!product || product.quantity < item.quantity) {
        return res.status(400).json({ success: false, message: `Insufficient stock for ${product?.productName || 'product'}` });
      }
      await Product.findByIdAndUpdate(item.product, { $inc: { quantity: -item.quantity } }, { new: true });
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
    //console.log("Userdata",userData)
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
      Date: order.orderDate.toLocaleDateString(), 
      userDetails: order.userDetails[0], 
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
  },
  
  couponDiscount: orders[0].discount
}];

    
    const Totalprice = orders[0].orderedItems.reduce((sum, element) => {
      return sum + element.quantity * element.price;
    }, 0);

    console.log("Total Price:", Totalprice);

    
    const userData = req.session.user || null;

    res.render("view-allorder", { 
      orders: formattedOrders, 
      Totalprice, 
      userData,
      couponDiscount: orders[0].discount || 0 
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

    console.log('Order Details:', JSON.stringify(order, null, 2)); 

    res.render('order-details', {
      order, 
      userData,
      user: req.session.user
    });

  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


const cancelOrder = async (req, res) => {
  try {
    console.log(req.body);
    const { orderId, productId } = req.body;
    ;

    // Find the order
    const order = await Order.findOne({ _id: orderId });
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // here updating  the order status
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: orderId, "orderedItems._id": productId },
      { $set: { "orderedItems.$.status": "Cancelled" } },
      { new: true }
    );

    //console.log(updatedOrder)

    if (!updatedOrder) {
      return res.status(400).json({ error: "Order update failed" });
    }

    const cancelledItem = order.orderedItems.find(item => item._id.toString() === productId);
  
    if (cancelledItem) {
      await Product.findByIdAndUpdate(
        cancelledItem.product,
        { $inc: { quantity: cancelledItem.quantity } }
      );

      // payment Updating area
      if (order.paymentMethod === "wallet" || order.paymentMethod === "razorpay") {
        const wallet = await Wallet.findOne({ user: order.userId });
        if (wallet) {
          wallet.balance += cancelledItem.price * cancelledItem.quantity;
          wallet.transactions.push({
            type: "credit",
            amount: (cancelledItem.price * cancelledItem.quantity)-updatedOrder.discount/updatedOrder.orderedItems.length,
            description: `Refund for cancelled order ${orderId}`
          });
          await wallet.save();
        }
      }
    }

    return res.json({ success: "Successfully cancelled" });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const returnOrder = async (req, res) => {
  try {
    const { orderId, productId, returnReason } = req.body;
    console.log("Return Request:", orderId, productId, returnReason);

    
    const order = await Order.findOne({ _id: orderId });
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

  //return requst add with the reason that we type
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: orderId, "orderedItems._id": productId },
      { $set: { "orderedItems.$.status": "Return Request", "orderedItems.$.returnReason": returnReason } },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(400).json({ error: "Order update failed" });
    }

    const returnedItem = order.orderedItems.find(item => item._id.toString() === productId);
    if (returnedItem) {
      
      if (order.paymentMethod === "wallet" || order.paymentMethod === "razorpay") {
        const wallet = await Wallet.findOne({ user: order.userId });
        if (wallet) {
          wallet.balance += returnedItem.price * returnedItem.quantity;
          wallet.transactions.push({
            type: "credit",
            amount: returnedItem.price * returnedItem.quantity,
            description: `Refund for returned order ${orderId}`
          });
          await wallet.save();
        }
      }
    }

    return res.json({ success: "Return request submitted successfully" });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};


const getAvailableCoupons = async (req, res) => {
  try {
    const currentDate = new Date();
    const availableCoupons = await Coupon.find({
      isListed: true,
      isDeleted: false,
      startOn: { $lte: currentDate },
      expireOn: { $gte: currentDate }
    });
    res.json(availableCoupons);
  } catch (error) {
    console.error('Error fetching coupons:', error);
    res.status(500).json({ message: 'Error fetching coupons' });
  }
};

const applyCoupon = async (req, res) => {
  try {
    const { couponCode, total } = req.body;
    const userId = req.session.user;

    const coupon = await Coupon.findOne({ 
      code: couponCode.toUpperCase(),
      isListed: true,
      isDeleted: false,
      startOn: { $lte: new Date() },
      expireOn: { $gte: new Date() }
    });

    if (!coupon) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired coupon' 
      });
    }

    // can check minimum price for coupon
    if (total < coupon.minimumPrice) {
      return res.status(400).json({ 
        success: false, 
        message: `Coupon is valid for minimum purchase of ₹${coupon.minimumPrice}` 
      });
    }

    // checking the max uses 
    const userUse = coupon.userUses.find(use => use.userId.toString() === userId);
    if (userUse && userUse.count >= coupon.maxUses) {
      return res.status(400).json({ 
        success: false, 
        message: 'You have exceeded the maximum uses for this coupon' 
      });
    }

    
    const discount = coupon.offerPrice;

  
    if (userUse) {
      await Coupon.updateOne(
        { _id: coupon._id, 'userUses.userId': userId },
        { $inc: { 'userUses.$.count': 1, usesCount: 1 } }
      );
    } else {
      await Coupon.updateOne(
        { _id: coupon._id },
        { 
          $push: { 
            userUses: { 
              userId, 
              count: 1 
            } 
          },
          $inc: { usesCount: 1 }
        }
      );
    }
    
    res.json({ 
      success: true, 
      discount, 
      message: 'Coupon applied successfully' 
    });
  } catch (error) {
    console.error('Error applying coupon:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error applying coupon' 
    });
  }
};

const downloadInvoice = async (req, res) => {
  try {
    const orderId = req.query.orderId;

    // Fetch order details
    const order = await Order.findById(orderId)
      .populate("orderedItems.product")
      .populate("userId");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Create a new PDF document
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice_${orderId}.pdf`);
    doc.pipe(res);

    // Header
    doc.fontSize(20).text('Invoice', { align: 'center' });
    doc.fontSize(10).text(`Order ID: ${orderId}`, { align: 'right' });
    doc.text(`Date: ${order.orderDate.toLocaleDateString()}`, { align: 'right' });
    doc.moveDown();

    // Company Info (assuming a generic placeholder; adjust as per your invoice model)
    doc.fontSize(12).text('Your Company Name', { align: 'left' });
    doc.fontSize(10).text('123 Business Street, City, State, ZIP', { align: 'left' });
    doc.text('Email: contact@company.com', { align: 'left' });
    doc.moveDown();

    // Customer Info
    doc.fontSize(12).text('Bill To:', { underline: true });
    doc.fontSize(10).text(order.shippingAddress.fullName);
    doc.text(`${order.shippingAddress.addressType}, ${order.shippingAddress.landmark}`);
    doc.text(`${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.pincode}`);
    doc.text(`Phone: ${order.shippingAddress.phone}`);
    doc.moveDown();

    // Table Header
    doc.fontSize(12).text('Order Items', { underline: true });
    doc.moveDown(0.5);
    const tableTop = doc.y;
    const itemWidth = 200;
    const qtyWidth = 50;
    const priceWidth = 80;
    const totalWidth = 80;

    doc.fontSize(10).text('Item', 50, tableTop, { width: itemWidth });
    doc.text('Qty', 250, tableTop, { width: qtyWidth, align: 'center' });
    doc.text('Price', 300, tableTop, { width: priceWidth, align: 'right' });
    doc.text('Total', 380, tableTop, { width: totalWidth, align: 'right' });
    doc.moveTo(50, tableTop + 15).lineTo(460, tableTop + 15).stroke();

    // Table Rows
    let y = tableTop + 25;
    order.orderedItems.forEach(item => {
      doc.text(item.product ? item.product.productName : 'N/A', 50, y, { width: itemWidth });
      doc.text(item.quantity.toString(), 250, y, { width: qtyWidth, align: 'center' });
      doc.text(`Rs. ${item.price}`, 300, y, { width: priceWidth, align: 'right' });
      doc.text(`Rs. ${item.quantity * item.price}`, 380, y, { width: totalWidth, align: 'right' });
      y += 20;
    });

    // Summary
    const summaryTop = y + 20;
    doc.fontSize(12).text('Order Summary', 50, summaryTop, { underline: true });
    doc.fontSize(10);
    doc.text('Subtotal:', 300, summaryTop + 20, { width: 100, align: 'right' });
    doc.text(`Rs. ${order.totalPrice}`, 400, summaryTop + 20, { width: 60, align: 'right' });
    doc.text('Discount:', 300, summaryTop + 40, { width: 100, align: 'right' });
    doc.text(`- Rs. ${order.discount || 0}`, 400, summaryTop + 40, { width: 60, align: 'right' });
    doc.text('Shipping:', 300, summaryTop + 60, { width: 100, align: 'right' });
    doc.text('Free', 400, summaryTop + 60, { width: 60, align: 'right' });
    doc.text('Total:', 300, summaryTop + 80, { width: 100, align: 'right' });
    doc.fontSize(12).text(`Rs. ${order.finalAmount}`, 400, summaryTop + 80, { width: 60, align: 'right' });

    // Footer
    doc.moveDown(2);
    doc.fontSize(8).text('Thank you for your purchase!', { align: 'center' });

    // Finalize the PDF
    doc.end();

  } catch (error) {
    console.error("Error generating invoice:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const handlePaymentFailure = async (req, res) => {
  try {
    const { orderId, cartId, razorpayPaymentId } = req.body;
    const userId = req.session.user;

    // Update order status to "Payment Failed"
    const order = await Order.findByIdAndUpdate(
      orderId,
      { 
        status: "Payment Failed",
        paymentGateway: "Razorpay",
        "orderedItems.$[].status": "Payment Failed"
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Clear the cart
    await Cart.deleteMany({ _id: cartId, userId });

    res.status(200).json({ success: true, message: "Payment failure handled" });
  } catch (error) {
    console.error("Error handling payment failure:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const retryPayment = async (req, res) => {
  try {
    const { orderId, amount } = req.body;

    const order = await Order.findById(orderId);
    if (!order || order.status !== "Payment Failed") {
      return res.status(400).json({ success: false, message: "Invalid order or status" });
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: amount * 100, // Convert to paise
      currency: "INR",
      receipt: orderId.toString(),
    });

    order.razorpayOrderId = razorpayOrder.id;
    await order.save();

    res.status(200).json({
      success: true,
      razorpayOrderId: razorpayOrder.id,
      amount: amount * 100
    });
  } catch (error) {
    console.error("Error retrying payment:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { orderId, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
    const crypto = require('crypto');

    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Invalid payment signature" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Update order status to "Processing"
    order.status = "Processing";
    order.orderedItems.forEach(item => {
      if (item.status === "Payment Failed") {
        item.status = "Processing";
      }
    });
    await order.save();

    res.status(200).json({ success: true, message: "Payment verified and order updated" });
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  getCheckoutPage,
  createOrder,
  getOrderPlacedPage,
  getOrderDetails,
  orderDetail,
  viewOrder,
  cancelOrder,
  returnOrder,
  getAvailableCoupons,
  applyCoupon,
  downloadInvoice,
  handlePaymentFailure,
  retryPayment,
  verifyPayment,
};