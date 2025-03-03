const User = require("../models/userSchema");

const userAuth = async (req, res, next) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login"); 
    }
    
    const user = await User.findById(req.session.user);
    
    if (!user) {
      console.log("User not found in database");
      delete req.session.user;
      return res.redirect("/login");
    }
    
    if (user.isBlocked) {
      console.log("User is blocked");
    
      delete req.session.user;
      return res.redirect("/login");
    }
    
    next(); 
  } catch (error) {
    console.log("Error in User auth middleware:", error);
    res.status(500).send("Internal server error");
  }
};

const adminAuth = (req, res, next) => {
  if (req.session.admin || req.path === "/admin/login") {
    return next();
  }
  
  return res.redirect("/admin/login");
};

module.exports = {
  userAuth,
  adminAuth,
};