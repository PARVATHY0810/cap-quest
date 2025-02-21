const User = require("../../models/userSchema");
const orders = require("../../models/orderSchema")
const Address = require("../../models/addressSchema");
//const Order = require("../../models/orderSchema");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");

const env = require("dotenv").config();
const session = require("express-session");


const profile = async (req, res) => {
  try {
    console.log("Session User ID:", req.session.user);

    if (!req.session.user) {
      return res.redirect("/login");
    }

    // Fetch user details along with orders
    const user = await User.findById(req.session.user);

    console.log("User Data:", user); // Debugging

    if (!user) {
      return res.redirect("/login");
    }

    // Ensure orders is always an array
    res.render("profile", { user: { ...user.toObject(), orders: user.orders || [] } });
  } catch (error) {
    console.error("Error loading profile:", error);
    res.status(500).send("Server Error");
  }
};

const loadUserProfile = async (req,res)=>{
  try {
    
    const userId = req.session.user;

    const user=await User.findById(userId)
   
    res.render("userProfile",{user})
  } catch (error) {
    console.error("error loading userProfile",error)
  }
}

const changeProfile = async (req, res) => {
  try {
    const { userId, name, currentpassword, NewPassword, Cpassword } = req.body;
    console.log(req.body)

    // Find user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Check if the user wants to change the password
    if (currentpassword || NewPassword || Cpassword) {
      if (!currentpassword || !NewPassword || !Cpassword) {
        return res.status(400).json({ success: false, message: "All password fields are required." });
      }

      // Check if the user has a password set (handling Google sign-in users)
      if (!user.password) {
        return res.status(400).json({ success: false, message: "Password change is not allowed for Google login users." });
      }

      // Verify the current password
      const passwordMatch = await bcrypt.compare(currentpassword, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ success: false, message: "Current password is incorrect." });
      }

      // Ensure new password and confirm password match
      if (NewPassword !== Cpassword) {
        return res.status(400).json({ success: false, message: "New password and confirm password do not match." });
      }

      // Hash and update the new password
      user.password = await bcrypt.hash(NewPassword, 10);
    }

    // Update name if provided
    if (name) {
      user.name = name;
    }

    // Save the updated user data
    await user.save();

    return res.status(200).json({ success: true, message: "Profile updated successfully!" });
  } catch (error) {
    console.error("Error updating profile:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// const loadAddress = async (req, res) => {
//   try {
//     const userId = req.session.user;
    
//     // Use the correct model name
//     const addresses = await Address.find({ userId });
//     console.log("Fetched addresses:", addresses);
//     res.render('address', { addresses });  // Ensure variable names match
//   } catch (error) {
//     console.error('Error loading address management page:', error);
//     res.status(500).send('An error occurred while loading the address management page.');
//   }
// };

const loadAddress = async (req, res) => {
  try {
    const userId = req.session.user;

    if (!userId) {
      console.error("User ID is missing.");
      return res.status(400).send("User ID is required.");
    }

    const addressData = await Address.find({ userId:userId });

    console.log(addressData)

    res.render("address",  {
      addressData }); // Send address array
  } catch (error) {
    console.error("Error loading address page:", error);
    res.status(500).send("An error occurred.");
  }
};

const addAddres=async(req,res)=>{
  try {
      const userId=req.session.user;
      
      res.render("addAddress",{firstLetter:"",userId,users:""})
  } catch (error) {
      console.log("error in addAddress route ")
  }
}
const addAAddress = async (req, res) => {
  try {
    const {
      userId,
      address_type,
      name,
      city,
      landmark,
      state,
      pincode,
      phone,
    
    } = req.body;

    console.log(req.body);

    if (!userId) {
      console.error("User ID is missing.");
      return res.status(400).json({ success: false, message: "User ID is required" });
    }

    let userAddress = await Address.findOne({ userId });

    console.log(userAddress)

    if (!userAddress) {
      userAddress = new Address({
        userId,
        address: [{ addressType: address_type, name, city, landmark, state, pincode, phone }]
      });
    } 
      const newAddress = new Address({ userId: userId, addressType: address_type, name, city, landMark: landmark, state, pincode, phone });


    await newAddress.save();
    res.redirect('/profile');
  } catch (error) {
    console.error("Error adding address:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};



const editAddress = async (req, res) => {     
  try {     
    console.log("Hai")
      const userId = req.session.user;    
      const addressId = req.params.id;
     
      const addressData = await Address.findOne({ _id:addressId });


      if (!addressData) {             
          return res.redirect('/profile');         
      }  

      // const totalAddress = addressData.address.find(addr => addr._id.toString() === addressId);
      
      res.render("editAddress", { userId,addressData });     
  } catch (error) {         
      console.error(error);         
      res.redirect('/profile');     
  } 
};

const updateAddress = async (req, res) => {
  try {
    console.log(req.body);

      const {  addressId, addressType, name, city, landmark, state, pincode, phone } = req.body;

      const updatedAddress = await Address.findByIdAndUpdate(
          {  _id: addressId }, // Find user’s address array and specific address
          {
            $set: {
              userId:req.session.user,
              addressType: addressType,
              name: name,
             city : city,
              landmark: landmark,
              state: state,
             pincode: pincode,
             phone: phone
            }
          },
          { new: true } // Return updated document
      );

      if (!updatedAddress) {
        return res.status(404).json({ success: false, message: "Address not found" });
      }

      res.redirect('/profile');
  } catch (error) {
      console.error(error);
      res.status(500).json({ success: false });
  }
};
const deleteAddress = async (req,res)=>{
  const {id} = req.params;
  console.log("delete function is working")
  try {
      
    const deleteAddress = await Address.findByIdAndDelete(id);
    if(!deleteAddress){
      return res.status(404).json({success:false,message:"Addres not found"})

    }
    return res.json({ success: true, message: 'Address deleted successfully!' });


  } catch (error) {
      console.error("deleting error",error.message);

  }
}





      module.exports = {
        profile,
        loadUserProfile,
        changeProfile,
        loadAddress,
        addAAddress,
        addAddres,
        updateAddress,
        editAddress,
        deleteAddress
      }