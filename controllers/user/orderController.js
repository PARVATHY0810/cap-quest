const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const Address = require('../../models/addressSchema')


const getCheckoutPage = async (req, res) => {
  try {
    const userId = req.session.user;  
    const userData = userId ? await User.findById(userId) : null;
    console.log(userData);

    // Fetch cart items
    const cartItems = await Cart.find({ userId }).populate("productId");
    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ message: "No items in cart" });
    }
    let subtotal = 0;
    cartItems.forEach((item) => {
      subtotal += item.price;
    });
    const cartId = cartItems[0]._id; // Assuming one cart or aggregating items

    // Fetch user's addresses
    const addresses = await Address.find({ userId });
    if (!addresses) {
      console.log("No addresses found for user:", userId);
    }

    res.render("checkout", {
      userData: "",
      cart: cartItems,
      addresses: addresses || [], // Pass addresses, default to empty array if none found
      total: subtotal,
      cartId: cartId,
      userId: userId,
    });
  } catch (error) {
    console.error("Error fetching checkout page:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// const getOrderDetails = async (req, res) => {
//   try {
//       const userId = req.session.user;
//       const userData = userId ? await User.findById(userId) : null;
//       const orderId = req.params.orderId;

//       // Fetch specific order and populate all necessary fields
//       const order = await Order.findOne({ orderId })
//           .populate({
//               path: 'orderItems.product',
//               model: 'Product'
//           })
//           .populate('address');

//       if (!order) {
//        return res.status(404).render('page-404', { 
//         message: 'Order not found',
//         userData,
//         user: req.session.user
//        });

//       }

//       res.render('orderDetails', {
//           order,
//           userData,
//           user: req.session.user
//       });

//   } catch (error) {
//       console.error('Error fetching order details:', error);
//       res.status(500).json({ message: 'Server error' });
//   }
// };

// const orderConfirmation = async (req, res) => {
//   try {
//     const userId = req.session.user;
//     const userData = await User.findById(userId);
//     const { orderId } = req.params;

//     const order = await Order.findById(orderId).populate("products.productId");

//     if (!order) {
//       return res.status(404).json({ message: "Order not found" });
//     }

//     res.render("orderConfirmation", { order, user: userData });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Error fetching Order Details" });
//   }
// };



const createOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    const { addressId, cartId, paymentMethod, finalAmount } = req.body;

    // Fetch the selected address
    const address = await Address.findById(addressId);
    if (!address) {
      return res.status(400).json({ success: false, message: "Invalid address" });
    }

    console.log(address)

    // Fetch the cart and populate product details
    const cartItems = await Cart.find({ userId }).populate("productId");
    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ success: false, message: "Cart not found" });
    }
    
    // Map cart items to the order schema format
    const orderedItems = cartItems.map(item => ({
      product: item.productId._id,
      quantity: item.quantity,
      price: item.price
    }));
    
    // Calculate total price from cart items
    const totalPrice = cartItems.reduce((sum, item) => sum + item.price, 0);
    // Create a new order
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
      deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      status: paymentMethod === "COD" ? "Pending COD" : "Pending",
      discount: 0, // Add logic for discount if applicable
      shippingCharge: 0 // Add logic for shipping charge if applicable
    });

    // Save the order to the database
    const savedOrder = await order.save();

    // Optionally, clear the cart after order placement
    await Cart.deleteMany({ userId });
    // Send success response with orderId
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

// const loadMyOrdersPage = async(req, res) => {
//   try {
//     const userId = req.session.user;
//     const userData = userId ? await User.findById(userId) : null;

//     const order = await Order.find({userId: userId})

//     console.log(order);

//     res.render('order-details', {
//       order,
//       userData,
//     });
//   } catch (error) {
//     console.log(error);
//   }
// }

const loadMyOrdersPage = async (req, res, next) => {
  try {
    const userId = req.session.user;
    const page = parseInt(req.query.page) || 1;
    const limit = 10; // Orders per page
    const userData = userId ? await User.findById(userId) : null;
    
    // Fetch orders with pagination and populate necessary fields
    const totalOrders = await Order.countDocuments({ userId });
    const totalPages = Math.ceil(totalOrders / limit);
    
    const orders = await Order.find({ userId: userId })
      .populate({
        path: 'orderedItems.product',
        select: 'productName productImage' 
      })
      // .populate('address')
      .sort({ orderDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Format orders for the template
    const formattedOrders = orders.map(order => ({
      orderId: order.orderId,
      placedOn: order.orderDate.toLocaleDateString(),
      status: getOrderStatus(order.status),
      totalAmount: order.finalAmount,
      quantity: order.orderedItems.reduce((sum, item) => sum + item.quantity, 0),
      shippingAddress: order.shippingAddress, // Add this
      product: {
        productName: order.orderedItems[0]?.product?.productName || 'Product Not Found',
        productImage: order.orderedItems[0]?.product?.productImage?.[0] || '/placeholder-image.jpg'
      },
    }));

    console.log(formattedOrders)

    res.render('order-details', {
      order: formattedOrders,
      userData,
      currentPage: page,
      totalPages: totalPages
    });
    
  } catch (error) {
   
  }
};

function getOrderStatus(status) {
  const statusMap = {
    'Pending': 1,
    'Pending COD': 1,
    'Processing': 2,
    'Shipped': 3,
    'Delivered': 4,
    'Return Request': 5,
    'Returned': 6, 
    'Cancelled': 0
  };
  return statusMap[status] || 0;
}

const getOrderDetails = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = userId ? await User.findById(userId) : null;
    const orderId = req.params.orderId;

    // Fetch specific order and populate all necessary fields
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
      order, // Pass as 'order', not 'orders'
      userData,
      user: req.session.user
    });

  } catch (error) {
    console.error('Error fetching order details:', error); // Debugging log
    res.status(500).json({ message: 'Server error' });
  }
};

// Add this to your existing exports
module.exports = {
  getCheckoutPage,
  createOrder,
  getOrderPlacedPage,
  loadMyOrdersPage,
  getOrderDetails
};