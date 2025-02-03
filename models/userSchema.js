const mongoose = require('mongoose');
const { search } = require('../routes/userRouter');
const {Schema} = mongoose;

const userSchema = new Schema({
  name : {
    type : String,
    required : true
  },
  email : {
    type : String,
    required : true,
    unique : true
  },
  // phone:{
  //   type : String,
  //   required : false,
  //   unique : false,
  //   sparse: true,
  //   defalt: null
  // },
  // googleId : {
  //   type : String,
  //   unique : true,
  // },
  password : {
    type : String,
    required : false
  },
  isBlocked : {
    type : Boolean,
    default : false
  },
  isAdmin : {
    type : Boolean,
    default : false
  },
  cart:[{
    type: Schema.Types.ObjectId,
    ref: 'Cart'
  }],
  wallet:{
    type: Schema.Types.ObjectId,
    defalt: 0
  },
  Wishlist:[{
    type: Schema.Types.ObjectId,
    ref: 'Wishlist'
  }],
  orderHistory:[{
    type: Schema.Types.ObjectId,
    ref: 'Order'
  }],
  createdOn : {
    type : Date,
    default : Date.now,
  },
  referalCode:{
    type: String,
    //required: true
  },
  redeemed:{
    type: Boolean,
    //defalt: false
  },
  redeemedUsers:[{
    type: Schema.Types.ObjectId,
    ref: 'User',
    //required: true
  }],
  searchHistory:[{
    category:{
    type:Schema.Types.ObjectId,
    ref: 'Category'
    },
    brand:{
      type : String
    },
    searchOne:{
      type : Date,
      default : Date.now
    },   
  }]
})



const user = mongoose.model('User',userSchema);
module.exports = user;