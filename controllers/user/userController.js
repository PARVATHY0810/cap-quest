const User = require("../../models/userSchema");
const category =require ("../../models/categorySchema");
const product = require("../../models/productSchema");

const env = require("dotenv").config();
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");

console.log('email', process.env.NODEMAILER_EMAIL);
console.log('password', process.env.NODEMAILER_PASSWORD);

const pageNotFound = async (req,res)=>{
  try{
    return res.render("page-404");
    console.log('Page Not Found rendered');
  } catch (error){
     return res.redirect('/pageNotFound');
     console.log('Page Not Found');
    }
};

const loadHomepage = async (req,res)=>{
  try{
    //console.log("hai")
    const user = req.session.user;
    console.log(user)
    const categories = await category.find({isListed:true});
    let productData = await product.find(
     {isBlocked:false,
      category:{$in:categories.map(category=>category._id)},quantity:{$gt:0}
     }

    )
    productData.sort((a,b)=> new Date (b.creatOne)-new Date(a.creatOne));
    productData = productData.slice(0,4);
  
    
     if(user){
      const userData = await User.findOne({_id:user});
      console.log(userData)
      return res.render("home",{userData,products:productData});
     
    }else{
      const userData = ""
      return res.render("home",{products:productData,userData});
   
    }
      
  }catch(error){
    console.error(error)
    res.status(500).send("server error")
  }
};


const loadShopPage = async (req,res)=>{
  try{
    return res.render("shop");
  }catch(error){
    console.log('Shop Page not Found')
    res.status(500).send("server error")
  }
}

const loadSignupPage = async (req,res)=>{
  try{
    res.render("signup");
    console.log('Signup Page rendered');
  } catch (error){
     console.log('Signup Page not Found');
    }
}
 
function generateOtp(){
  return Math.floor(100000 + Math.random() * 900000).toString();
}
async function sendVerificationEmail(email,otp){
  try {
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth:{
          user: process.env.NODEMAILER_EMAIL,
          pass: process.env.NODEMAILER_PASSWORD
        }
      })
      const info =  await transporter.sendMail({
        from: process.env.NODEMAILER_EMAIL,
        to: email,
        subject: " Verify your account",
        text: `Your OTP is ${otp}`,
        html:`<b>Your OTP :${otp}</b>`
      })
      return info.accepted.length > 0;
  } catch (error) {
    console.log('Email not sent',error);
    return false;
  }
}

const signup = async (req,res)=>{
  try{
    const {name,email,password,cPassword} = req.body;
    console.log('User data',name,email,password,cPassword);
    if(password !== cPassword){
      return res.status(400).send("Password does not match");
    }
   
    
    const findUser = await User.findOne({ email });
    console.log("user", User)
    console.log(User)
    if(findUser){
      return res.render("signup",{message:"User already exists"});
    }
    const otp = generateOtp();
    console.log('OTP generated',otp);
    const emailSent = await sendVerificationEmail(email,otp);
    if(!emailSent){
      return res.status(500).send("Email not sent");
    }
    req.session.userOtp = otp;
    req.session.userData = {name,email,password};
    console.log('User signed up',req.session.userData);
    res.redirect('/verify-otp');
    // res.render("verify-otp");
    //console.log('OTP sent',otp);

  } catch (error){
    console.log('User not signed up',error);
    res.redirect("/pageNotFound"); //onne nookanam redirect signup le kke aano pagenotfound le kke anno veande nne
  }
}

const securePassword = async (password)=>{
  try{
    const passwordHash = await bcrypt.hash(password,10);
    return passwordHash;
} catch (error){
  console.log('Password not hashed',error);
  return false;
}
}

const loadOtp=async(req,res)=>{
  try {
    console.log("OTP page loaded");
     return res.render('verify-otp');
    
    
  } catch (error) {
    console.log("Verify page not found")
  }
}

const verifyOtp = async (req,res)=>{  
  try{
    //res.render('verify-otp');
    const { otp } = req.body;
    console.log("OTP entered",otp);
    console.log("OTP session",req.session.userOtp);
    console.log('OTP entered');
    if(otp === req.session.userOtp){
      const { name, email, password } = req.session.userData;
      console.log('User data', password);
      const passwordHash = await securePassword(password);
     const saveUserData = new User({
        name: name,
        email: email,
        password: passwordHash,
      })
      await saveUserData.save();
      req.session.user = saveUserData._id;
      res.json({success: true, redirectUrl: "/"});
    }else{
      res.status(400).send("Invalid OTP,Please try again");
    }
  } catch (error){
    console.error('Error verifying OTP ',error);
    res.status(500).json({success:false,message:"An error occurd"});
  }
}


const resendOtp = async (req, res) => {
  try {

    if (!req.session.userData || !req.session.userData.email) {
      return res
        .status(400)
        .json({ success: false, message: "email not found in session" });
    }

    const otp = generateOtp();
    req.session.userOtp = otp;

    const emailSent = await sendVerificationEmail(
      req.session.userData.email,
      otp,
    );

    if (emailSent) {
      console.log("Resend OTP", otp);
      return res
        .status(200)
        .json({ success: true, message: "otp resend successfully" });
    }

    return res.status(500).json({
      success: false,
      message: "failed to resend otp. Please try again",
    });
  } catch (error) {
    console.error("Error resending OTP", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.Please try again ",
    });
  }
};

const loadLogin = async (req,res)=>{
  try{
    if(!req.session.user){
      return res.render("login");
    }else{
      return res.redirect("/");
    }
  } catch (error){
     return res.redirect('/pageNotFound');
    }
}
  
const login = async (req,res)=>{
  try{
    console.log("hai")
    const {email,password} = req.body;
    const findUser = await User.findOne({isAdmin:0,email});
    console.log(findUser)
    if(findUser.isBlocked==true){
      return res.render("login",{message:"User is blocked by admin"});
    }
    const passwordMatch = await bcrypt.compare(password,findUser.password);
    if(!passwordMatch){
      return res.render("login",{message:"Invalid password"});
    }
    
      req.session.user = findUser._id;
      res.redirect("/");

    } catch (error){
      console.log('User not logged in',error);
      res.render("login",{message:"An error occured"});
    }
    }

   const logout = async (req,res)=>{
    try{
      req.session.destroy((err)=>{
      if(err){
        console.log('Error destroying session',err.message);
        return res.redirect("/pageNotFound");
      }
       return res.redirect("/login");
    })
    } catch (error){
      console.log('User not logged out',error);
      res.redirect("/pageNotFound");
    }
  }

module.exports = {
  loadHomepage,
  loadSignupPage,
  pageNotFound,
  loadShopPage,
  signup,
  verifyOtp,
  loadOtp,
  resendOtp,
  loadLogin,
  login,
  logout
}