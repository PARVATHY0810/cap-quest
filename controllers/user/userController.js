const User = require("../../models/userSchema");


const pageNotFound = async (req,res)=>{
  try{
    res.render("page-404");
    console.log('Page Not Found rendered');
  } catch (error){
     console.log('Page Not Found');
    }
};

const loadHomepage = async (req,res)=>{
  try{
    return res.render("home");
  }catch(error){
    console.log('Home Page not Found')
    res.status(500).send("server error")
  }
}


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
 
const signup = async (req,res)=>{ 
    const {name,email,password} = req.body;
    try{
     const newUser = new User({name,email,password});
     console.log('User created', newUser);
     await newUser.save();
     console.log('User signed up');
     return res.redirect("/signup");
  } catch (error){
    console.error('Error for save user',error);
    res.status(500).send("server error");
  }
}




module.exports ={
  loadHomepage,
  loadSignupPage,
  pageNotFound,
  loadShopPage,
  signup
}