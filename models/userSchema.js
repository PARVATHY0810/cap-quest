// const mongoose = require('mongoose');
// const { search } = require('../routes/userRouter');
// // const {Schema} = mongoose;

// const userSchema = new mongoose.Schema({
//   name : {
//     type : String,
//     required : true
//   },
//   email : {
//     type : String,
//     required : true,
//     unique : true
//   },
//   // phone:{
//   //   type : String,
//   //   required : false,
//   //   unique : false,
//   //   sparse: true,
//   //   defalt: null
//   // },
//   googleId : {
//     type : String,
//     unique : true,
//   },
//   password : {
//     type : String,
//     required : false
//   },
//   isBlocked : {
//     type : Boolean,
//     default : false
//   },
//   isAdmin : {
//     type : Boolean,
//     default : false
//   },
//   cart:[{
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Cart'
//   }],
//   wallet:{
//     type: mongoose.Schema.Types.ObjectId,
//     defalt: 0
//   },
//   Wishlist:[{
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Wishlist'
//   }],
//   orderHistory:[{
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Order'
//   }],
//   createdOn : {
//     type : Date,
//     default : Date.now,
//   },
//   referalCode:{
//     type: String,
//     //required: true
//   },
//   redeemed:{
//     type: Boolean,
//     //default: false
//   },
//   redeemedUsers:[{
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     //required: true
//   }],
//   searchHistory:[{
//     category:{
//     type:mongoose.Schema.Types.ObjectId,
//     ref: 'Category'
//     },
//     brand:{
//       type : String
//     },
//     searchOne:{
//       type : Date,
//       default : Date.now
//     },   
//   }]
// })



// const User = mongoose.model('User',userSchema);
// module.exports = User;

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
});

const User = mongoose.model("User", userSchema);
module.exports = User;
