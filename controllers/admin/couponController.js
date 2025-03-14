const Coupons = require('../../models/couponSchema'); // Adjust path to match your Coupon model file

const getCouponPage = async (req, res, next) => {
    try {
        // Pagination 
        const page = parseInt(req.query.page) || 1;
        const limit = 10; 
        const skip = (page - 1) * limit;

        // Count total active (non-deleted) coupons
        const totalCoupons = await Coupons.countDocuments({ isDeleted: false });
        const totalPages = Math.ceil(totalCoupons / limit);

        // Fetch coupons with pagination and sorting
        const coupons = await Coupons.find({ isDeleted: false })
            .skip(skip)
            .limit(limit)
            .sort({ createdOn: -1 }) 
            .select('code offerPrice minimumPrice startOn expireOn maxUses usesCount isListed'); // Select only needed fields

        
        res.render('coupon', {
            coupons, 
            currentPage: page,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        });
    } catch (error) {
        console.error('Error in getCouponPage:', error);
        next(error); 
    }
};

const addCoupon = async (req, res) => {
  try {
      let {
          code,
          offerPrice,
          minimumPrice,
          startOn,
          maxUses,
          expireOn
      } = req.body;

      // Validatations
      if (!code || typeof code !== 'string' || code.trim() === '') {
          return res.status(400).json({
              success: false,
              message: 'Valid coupon code is required'
          });
      }

      if (!offerPrice || !minimumPrice || !startOn || !expireOn) {
          return res.status(400).json({
              success: false,
              message: 'All required fields must be provided'
          });
      }

      
      code = code.trim().toUpperCase();

      // Additional validations
      if (Number(offerPrice) <= 0 || Number(minimumPrice) <= 0) {
          return res.status(400).json({
              success: false,
              message: 'Offer price and minimum price must be positive numbers'
          });
      }

      if (new Date(startOn) >= new Date(expireOn)) {
          return res.status(400).json({
              success: false,
              message: 'Start date must be before expiry date'
          });
      }

      const newCoupon = new Coupons({
          code,
          offerPrice: Number(offerPrice),
          minimumPrice: Number(minimumPrice),
          startOn: new Date(startOn),
          maxUses: maxUses ? Number(maxUses) : 5, 
          expireOn: new Date(expireOn),
          createdOn: new Date(),
          usesCount: 0,
          userUses: [],
          isListed: true,
          isDeleted: false
      });

      await newCoupon.save();

      res.status(201).json({
          success: true,
          message: 'Coupon created successfully',
          coupon: newCoupon
      });
  } catch (error) {
      console.error('Error in addCoupon:', error);
      if (error.code === 11000) {
          return res.status(400).json({
              success: false,
              message: 'This coupon code already exists'
          });
      }
      res.status(500).json({
          success: false,
          message: 'Internal server error'
      });
  }
};

const toggleCouponStatus = async (req, res) => {
  try {
      const { couponId } = req.params;

      const coupon = await Coupons.findOne({ 
          _id: couponId, 
          isDeleted: false 
      });

      if (!coupon) {
          return res.status(404).json({
              success: false,
              message: 'Coupon not found'
          });
      }

      const newStatus = !coupon.isListed;
      await Coupons.findByIdAndUpdate(couponId, { isListed: newStatus });

      res.status(200).json({ 
          success: true, 
          message: `Coupon ${newStatus ? 'listed' : 'unlisted'} successfully`,
          isListed: newStatus
      });
  } catch (error) {
      console.error('Error in toggleCouponStatus:', error);
      res.status(500).json({ 
          success: false, 
          message: 'Internal server error' 
      });
  }
};

const getCouponById = async (req, res) => {
    try {
      const { couponId } = req.params;
      const coupon = await Coupons.findById(couponId);
      if (!coupon) {
        return res.status(404).json({ success: false, message: 'Coupon not found' });
      }
      res.status(200).json(coupon);
    } catch (error) {
      console.error('Error in getCouponById:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };
  
  const updateCoupon = async (req, res) => {
    try {
      const { couponId } = req.params;
      const { code, offerPrice, minimumPrice, startOn, expireOn, maxUses } = req.body;
  
      const updatedCoupon = await Coupons.findByIdAndUpdate(couponId, {
        code,
        offerPrice,
        minimumPrice,
        startOn: new Date(startOn),
        expireOn: new Date(expireOn),
        maxUses
      }, { new: true });
  
      if (!updatedCoupon) {
        return res.status(404).json({ success: false, message: 'Coupon not found' });
      }
  
      res.status(200).json({ success: true, message: 'Coupon updated successfully', coupon: updatedCoupon });
    } catch (error) {
      console.error('Error in updateCoupon:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };
  
  const deleteCoupon = async (req, res) => {
    try {
      const { couponId } = req.params;
      const deletedCoupon = await Coupons.findByIdAndUpdate(couponId, { isDeleted: true }, { new: true });
  
      if (!deletedCoupon) {
        return res.status(404).json({ success: false, message: 'Coupon not found' });
      }
  
      res.status(200).json({ success: true, message: 'Coupon deleted successfully' });
    } catch (error) {
      console.error('Error in deleteCoupon:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };
  
  module.exports = {
    getCouponPage,
    addCoupon,
    toggleCouponStatus,
    getCouponById,
    updateCoupon,
    deleteCoupon
  };

