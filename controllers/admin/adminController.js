 const User = require("../../models/userSchema") 
const path = require('path');
// const mongoose = require('mongoose');
const bcrypt = require('bcrypt');


const pageerror =async (req,res)=>{
  res.render("admin-error")
}


const loadlogin = async (req, res) => { 
// try {
//     console.log("hai")
if(req.session.admin){
  res.redirect("/admin/dashboard");
}
//      
//   } catch (error) {
     res.render("adminLoginPage",{message:null});
  }
   
// }
  
const login = async (req,res)=>{
  try{
    const {email,password} = req.body;
    const admin = await User.findOne({email,isAdmin:true});
    if(admin){
      const passwordMatch =  bcrypt.compare(password,admin.password);
      if(passwordMatch){
        req.session.admin = true;
      return res.redirect("/admin/dashboard");
      } else{
        return res.redirect("/adminLogin");
      }
    } else{
      return res.redirect("/adminLogin")
    }
  } catch (error){
    console.log('Admin not logged in',error);
     return res.redirect("/pageerror");
   }
 };

  const loadDashboard = async (req,res)=>{
    if(req.session.admin){
      try{
        res.render("dashboard")
      } catch (error){
        res.redirect("/pageerror")
      }
    }
  }

  // const dashboard =async(req,res)=>{
  //   try {
  //     res.render("dashboard")
  //   } catch (error) {
  //     console.log("error in dashboard controller")
  //   }
  // }

const logout = async (req,res)=>{
  try{
    req.session.destroy(err =>{
      if(err){
        console.log("Error destroying session",err);
        return res.redirect("/pageerror")
      }
      res.redirect("/admin/login")
    })
  }catch (erroe){
    console.log(("unexpected error during logot",error))
    res.redirect("/pageerror");
  }
};


   module.exports = {
     loadlogin, 
     login, 
    loadDashboard,
    pageerror,
    logout,
    //dashboard
 };