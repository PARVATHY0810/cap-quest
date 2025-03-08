const User = require("../../models/userSchema");
const category = require ("../../models/categorySchema");
const product = require("../../models/productSchema");
const Brand = require("../../models/brandSchema");

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

const checkReferralCode = async (req, res) => {
  try {
    const { referralCode } = req.body;
    const referrer = await User.findOne({ referralCode });
    res.json({ valid: !!referrer });
  } catch (error) {
    console.error('Error checking referral code:', error);
    res.status(500).json({ valid: false });
  }
};

const signup = async (req, res) => {
  try {
    const { name, email, password, cPassword, referralCode } = req.body; // Add referralCode here
    console.log('User data', name, email, password, cPassword, referralCode);

    if (password !== cPassword) {
      return res.render("signup", { message: "Password does not match" });
    }

    const findUser = await User.findOne({ email });
    if (findUser) {
      return res.render("signup", { message: "User already exist" });
    }

    const otp = generateOtp();
    console.log('Generated OTP:', otp);
    const emailSent = await sendVerificationEmail(email, otp);
    if (!emailSent) {
      return res.render("signup", { message: "Error sending verification email" });
    }

    // Generate a unique referral code for the new user
    const newReferralCode = await generateReferralCode();

    // Check if a referral code was provided and link referredBy
    let referredBy = null;
    if (referralCode) {
      const referrer = await User.findOne({ referralCode });
      if (referrer) {
        referredBy = referrer._id;
      } else {
        console.log('Invalid referral code provided:', referralCode);
      }
    }

    req.session.userOtp = otp;
    req.session.userData = { name, email, password, referralCode: newReferralCode, referredBy }; // Store referral data in session
    console.log('User signed up', req.session.userData);
    res.redirect('/verify-otp');

  } catch (error) {
    console.log('User not signed up', error);
    res.redirect("/pageNotFound");
  }
};

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

const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    console.log('Received OTP:', otp);
    if (otp === req.session.userOtp) {
      const { name, email, password, referralCode, referredBy } = req.session.userData;
      const passwordHash = await securePassword(password);
      const saveUserData = new User({
        name: name,
        email: email,
        password: passwordHash,
        referralCode: referralCode,
        referredBy: referredBy,
      });
      await saveUserData.save();

      // Handle wallet updates if referredBy exists
      if (referredBy) {
        const Wallet = require('../../models/walletSchema');
        
        // Update or create new user's wallet
        let newUserWallet = await Wallet.findOne({ user: saveUserData._id });
        if (!newUserWallet) {
          newUserWallet = new Wallet({ user: saveUserData._id, balance: 0 });
        }
        newUserWallet.balance += 500;
        newUserWallet.transactions.push({
          type: 'credit',
          amount: 500,
          description: 'Referral bonus'
        });
        await newUserWallet.save();

        // Update referrer's wallet
        let referrerWallet = await Wallet.findOne({ user: referredBy });
        if (!referrerWallet) {
          referrerWallet = new Wallet({ user: referredBy, balance: 0 });
        }
        referrerWallet.balance += 500;
        referrerWallet.transactions.push({
          type: 'credit',
          amount: 500,
          description: 'Referral bonus for new user signup'
        });
        await referrerWallet.save();
      }

      req.session.user = saveUserData._id;
      res.json({ 
        success: true, 
        redirectUrl: "/", 
        message: referredBy ? "₹500 has been added to your and your friend's wallet." : "Signup successful!" 
      });
    } else {
      res.status(400).send("Invalid OTP, Please try again");
    }
  } catch (error) {
    console.error('Error verifying OTP ', error);
    res.status(500).json({ success: false, message: "An error occurred" });
  }
};


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
  
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const findUser = await User.findOne({ isAdmin: 0, email });
    console.log(findUser);
    if (!findUser) {
      return res.render("login", { message: "User not found" });
    }
    if (findUser.isBlocked == true) {
      return res.render("login", { message: "User is blocked by admin" });
    }
    const passwordMatch = await bcrypt.compare(password, findUser.password);
    if (!passwordMatch) {
      return res.render("login", { message: "Invalid password" });
    }

    // Check if the user has a referral code; if not, generate and save one
    if (!findUser.referralCode) {
      const newReferralCode = await generateReferralCode();
      findUser.referralCode = newReferralCode;
      await findUser.save(); // Save the updated user document
      console.log(`Generated and saved referral code for ${email}: ${newReferralCode}`);
    } else {
      console.log(`User ${email} already has referral code: ${findUser.referralCode}`);
    }

    req.session.user = findUser._id;
    res.redirect("/");

  } catch (error) {
    console.log('User not logged in', error);
    res.render("login", { message: "An error occurred" });
  }
};

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

 
    const otp = generateOtp();
    user.forgotPasswordOtp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000; 
    await user.save();
    console.log(otp)
    req.session.user=email
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
    let userData;
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

    const filter = {
      isBlocked: false,
      status: "Available"
    };

    if (query.search) {
      filter.productName = { $regex: query.search, $options: 'i' };
    }

    if (query.category) {
      filter.category = query.category;
    }

    
if (query.brand) {
  
  const brandDoc = await Brand.findById(query.brand);
  if (brandDoc) {
      filter.brand = brandDoc.brandName; 
  } else {
      filter.brand = null; 
  }
}
 
    if (query.minPrice || query.maxPrice) {
      filter.salePrice = {};
      if (query.minPrice) filter.salePrice.$gte = parseInt(query.minPrice);
      if (query.maxPrice) filter.salePrice.$lte = parseInt(query.maxPrice);
    }

    let sortOptions = {};
    switch (query.sort) {
      case 'popularity':
        sortOptions = { popularityScore: -1 };
        break;
      case 'price-asc':
        sortOptions = { salePrice: 1 };
        break;
      case 'price-desc':
        sortOptions = { salePrice: -1 };
        break;
      case 'ratings':
        sortOptions = { averageRating: -1 };
        break;
      case 'featured':
        sortOptions = { isFeatured: -1, createdAt: -1 };
        break;
      case 'new-arrivals':
        sortOptions = { createdAt: -1 };
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

    const [products, categories, brands] = await Promise.all([
      product.find(filter)
        .sort(sortOptions)
        .populate('category')
        .populate('brand'), 
      category.find({ isListed: true }),
      Brand.find({ isBlocked: false })
    ]);

    res.render('shop', {
      products,
      categories,
      brands,
      query,
      userData,
      isLoggedIn: !!req.session.user
    });

  } catch (error) {
    console.error('Shop page error:', error);
    res.status(500).send('Internal Server Error');
  }
};

// Generate a unique referral code
async function generateReferralCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const existingUser = await User.findOne({ referralCode: code });
  if (existingUser) {
    return generateReferralCode(); // Recursively generate a new one if it exists
  }
  return code;
}


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
  loadShop,
  checkReferralCode
}