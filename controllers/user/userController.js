const User = require("../../models/userSchema");
const category =require ("../../models/categorySchema");
const product = require("../../models/productSchema");
const Brand = require("../../models/brandSchema")

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

    const categories = await category.find({isListed:true});
    let productData = await product.find(
     {isBlocked:false,
      category:{$in:categories.map(category=>category._id)},quantity:{$gt:0}
     }

    )
    productData.sort((a,b)=> new Date (b.creatOne)-new Date(a.creatOne));
    // productData = productData.slice(0,4);
  
    
     if(user){
      const userData = await User.findOne({_id:user});
      //console.log(userData)
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
      // return res.status(400).send("Password does not match");
      return res.render("signup",{message:"Password does not match"});
    }
   
    
    const findUser = await User.findOne({ email });
    //console.log("user", User)
   // console.log(User)
  
    if(findUser){
      return res.render("signup",{message:"User already exist"});
    }
    const otp = generateOtp();
    console.log('OTP generated',otp);
    const emailSent = await sendVerificationEmail(email,otp);
    if(!emailSent){
      // return res.status(500).send("Email not sent");
      return res.render("signup", { message: "Error sending verification email" });
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

const forgotPasssword = async (req, res) => {
  try {

    return res.render("forgot-password")
    
  } catch (error) {
    console.log('Forgot password page renderign error',error);
    res.redirect("/pageNotFound");
  }
}
const forgotPassswordSendLink = async (req, res) => {
  try {
    const { email } = req.body;

    console.log("Received email:", email);
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const user = await User.findOne({ email, isAdmin: false });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    console.log("User found:", user);

    // Generate OTP
    const otp = generateOtp();
    user.forgotPasswordOtp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000; 
    await user.save();

    console.log(otp)
   
    req.session.user=email
    // Send success response
     res.json({ success: true, message: "OTP sent to email" });
     

  } catch (error) {
    console.error("Error in forgot password:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const newPassword = async (req, res) => {
  try{
    return res.render("new-password")

  }
    
   catch (error) {
    console.log('Forgot password page renderign error',error);
    res.redirect("/pageNotFound");
  }
}

const changePassword=async(req,res)=>{
  try {
    const passwordHash = await bcrypt.hash(req.body.password,10);
   await User.updateOne({email:req.session.user},{password:passwordHash})
   req.session.user=null
   res.json({success:"Successfully changed the password"})
  } catch (error) {
    console.log(error)
  }
}

const CapProductDetails = async(req,res)=>{
  try {
    
      const Products=await product.find({isBlocked:false})
      const User=req.session.user
      
   

      res.render("productDetails",{User,Products})
  } catch (error) {
      console.log("error")
  }
}

const handleGoogleLogin = async (req, res) => {
  try {

    req.session.user = req.user._id;
    
    res.redirect("/");
  } catch (error) {
    console.log("error")
  }
}

const loadShop = async (req, res) => {
  try {
      // Initialize userData as null
      let userData ;
      
      // Check if user is logged in and get user data if they are
      if (req.session.user) {
          userData = await User.findOne({ _id: req.session.user });
      }
  

      const query = {
          search: req.query.search || '',
          sort: req.query.sort || '',
          category: req.query.category || '',
          brand: req.query.brand || '',
          maxPrice: req.query.maxPrice || '',
          minPrice: req.query.minPrice || ''
      };

      // Base filter conditions
      const filter = {
          isBlocked: false,
          status: "Available"
      };

      // Add search filter if provided
      if (query.search) {
          filter.productName = { $regex: query.search, $options: 'i' };
      }

      // Add category filter if provided
      if (query.category) {
          filter.category = query.category;
      }

      // Add brand filter if provided
      if (query.brand) {
          filter.brand = query.brand;
      }

      // Add price range filter if provided
      if (query.minPrice || query.maxPrice) {
          filter.salesPrice = {};
          if (query.minPrice) filter.salesPrice.$gte = parseInt(query.minPrice);
          if (query.maxPrice) filter.salesPrice.$lte = parseInt(query.maxPrice);
      }

      // Sort options
      let sortOptions = {};
      switch (query.sort) {
          case 'price-asc':
              sortOptions = { salesPrice: 1 };
              break;
          case 'price-desc':
              sortOptions = { salesPrice: -1 };
              break;
          case 'name-asc':
              sortOptions = { productName: 1 };
              break;
          case 'name-desc':
              sortOptions = { productName: -1 };
              break;
          default:
              sortOptions = { createdAt: -1 };
      }

      // Fetch all required data
      const [products, categories, brands] = await Promise.all([
          product.find(filter)
                 .sort(sortOptions)
                 .populate('category')
                 .populate('brand'),
          category.find({ isListed: true }),
          Brand.find()
      ]);

     

      // Render the shop page with or without user data
      res.render('shop', {
          products,
          categories,
          brands,
          query,
          userData, // This will be null for non-logged-in users
          isLoggedIn: !!req.session.user // Add a boolean flag for login status
      });

  } catch (error) {
      console.error('Shop page error:',error);
      res.status(500).send('Internal Server Error');
  }
};



module.exports = {
  loadHomepage,
  loadSignupPage,
  pageNotFound,
  signup,
  verifyOtp,
  loadOtp,
  resendOtp,
  loadLogin,
  login,
  forgotPasssword,
  forgotPassswordSendLink,
  newPassword,
  CapProductDetails,
  logout,
  changePassword,
  handleGoogleLogin,
  loadShop
}