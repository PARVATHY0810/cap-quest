const User = require('../../models/userSchema');
const Wallet = require('../../models/walletSchema');
const Address = require('../../models/addressSchema');
const Cart = require('../../models/cartSchema');
const Order = require('../../models/orderSchema');
const Razorpay = require('razorpay');
const crypto = require('crypto');


// Render Wallet Page
// const loadWalletPage = async (req, res) => {
//   try {
//       // Fetch user information
//       const user = req.session.user; // Or however you're storing user info
      
//       // Fetch wallet information
//       const wallet = await Wallet.findOne({ userId: req.session.user._id });
      
//       // Fetch transactions
//       const transactions = await Wallet.find({ userId: req.session.user._id })
//           .sort({ date: -1 }); // Sort by most recent first
      
//       // Render the page with all necessary data
//       res.render('user-wallet', {
//           user: user, // Pass user object
//           wallet: wallet,
//           transactions: transactions
//       });
//   } catch (error) {
//       console.error('Error loading wallet page:', error);
//       res.status(500).render('page-404', { message: 'Failed to load wallet page' });
//   }
// };


const loadWalletPage = async (req, res) => {
    try {
        // Fetch user information
        const user = req.session.user; 
        
        // Fetch wallet information, populating user details
        const wallet = await Wallet.findOne({ user: req.session.user._id });
        
        // Sort transactions in descending order (most recent first)
        const transactions = wallet ? wallet.transactions.sort((a, b) => b.date - a.date) : [];
        
        // Render the page with all necessary data
        res.render('user-wallet', {
            user: user,
            wallet: wallet || { balance: 0 },
            transactions: transactions
        });
    } catch (error) {
        console.error('Error loading wallet page:', error);
        res.status(500).render('page-404', { message: 'Failed to load wallet page' });
    }
};



module.exports = {
  loadWalletPage,
}

