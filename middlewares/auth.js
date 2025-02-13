const User=require ("../models/userSchema")
const userAuth =(req,res,next)=>{
 if( req.session.user){
  User.findById(req.session.User)
  .then(data=>{
    if(data && !data.isBlocked){
      next()
    }else{
      res.redirect("/login")
    }
  })
  .catch (error=>{
    console.log("Error in User auth middlware");
    res.status(500).send("Internal server error")
  })
 }else{
  res.redirect("/login")
 }
}
const adminAuth = (req,res,next)=>{
   if(req.session.admin || req.path === "/admin/login"){
    next()
   }else{
    if(req.originalUrl !== "/admin/login"){
      res.redirect("/admin/login")
    }else{
      next()
    }
    return res.redirect("/admin/login")
   }
}

module.exports = {
  userAuth,
  adminAuth
}