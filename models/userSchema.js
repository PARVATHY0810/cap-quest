const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  googleId: { type: String, unique: false },
  password: { type: String, required: false },
  isBlocked: { type: Boolean, default: false },
  isAdmin: { type: Boolean, default: false },
  cart: [{ type: mongoose.Schema.Types.ObjectId, ref: "Cart" }],
  wallet: { type: Number, default: 0 }, 
  Wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Wishlist" }],
  orderHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
  createdOn: { type: Date, default: Date.now },
  referalCode: { type: String },
  redeemed: { type: Boolean },
  redeemedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  searchHistory: [
    {
      category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
      brand: { type: String },
      searchOne: { type: Date, default: Date.now },
    },
  ],
  forgotPasswordOtp: { type: String, default: null }, // Add this field
  otpExpires: { type: Date, default: null } // Optional: Store OTP expiration time
});

const User = mongoose.model("User", userSchema);
module.exports = User;
