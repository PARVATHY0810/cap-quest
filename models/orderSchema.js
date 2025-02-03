const mongoose = require('mongoose');
const {Schema} = mongoose;
const {v4:uuidv4} = require('uuid');
const { schema } = require('./userShema');

const orderSchema = new Schema({
  orderId:{
    type: String,
    default: ()=>uuidv4,
    unique: true
  },
  orderItems:[{
    product:{
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity:{
      type: Number,
      required: true
    },
    price:{
      type: Number,
      defalt:0
    },
  }],
  totalPrice:{
    type: Number,
    required: true
  },
  discount:{
    type: Number,
    default: 0
  },
  finalAmount:{
    type: Number,
    required: true
  },
  address:{
    type:schema.Types.ObjectId,
    ref: 'user',  
    required: true
  },
  invoiceDate:{
    type: Date
  },
  status:{
    type: String,
    required: true,
    enum:["Pending","Processing","Return Request","Shipped","Delivered","Cancelled","Returned"]
  },
  createdOn:{
    type: Date,
    default: Date.now,
    required: true
  },
  couponApplied:{ 
    type:Boolean,
    default:false
  }

})



const Order = mongoose.model('Order',orderSchema);

module.exports = Order;