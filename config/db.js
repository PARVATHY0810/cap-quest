const mongoose = require("mongoose");
const env = require("dotenv").config();


const connectDB =()=>{
  try {

  mongoose.connect(process.env.MONGODB_URI);
    console.log("DB Connected");

  } catch (error){
     console.log("DB connectiom error",error.message);
     process.exit(1);
  }
}

module.exports = connectDB;