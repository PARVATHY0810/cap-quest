const User = require("../models/userSchema");

const userAuth = async (req, res, next) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login"); // User not logged in
    }

    const user = await User.findById(req.session.user); // Fix case issue here

    if (!user) {
      console.log("User not found in database");
      req.session.destroy(); // Clear session if user is missing
      return res.redirect("/login");
    }

    if (user.isBlocked) {
      console.log("User is blocked");
      req.session.destroy(); // Destroy session if user is blocked
      return res.redirect("/login");
    }

    next(); // Proceed if user is authenticated and not blocked
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
