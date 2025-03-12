const User = require("../../models/userSchema");



const customerInfo =async (req,res)=>{
  try{
     
    let search = "";
    if(req.query.search){
      search=req.query.search;
    }
     let page=1;
     if(req.query.page){
      page=req.query.page
     }
     const limit=4
     const UserData = await User.find({
      isAdmin: false,
      $or:[
        {name: {$regex: ".*" + search + ".*"} },
            {email: {$regex: ".*" + search + ".*"} },
        ],
    })
    .sort({ createdOn: -1 })
    .limit(limit*1)
    .skip((page-1)*limit)
    .exec();

    

    const count = await User.countDocuments({
        isAdmin:false,
        $or: [      
            {name: {$regex: "." + search + "."} },
            {email: {$regex: "." + search + "."} },
        ],
    })

    const totalPages = Math.ceil(count / limit);
   
console.log(page)

    return res.render('customers',{
        data: UserData,
            totalPages,
            currentPage: page,
            searchTerm: search,
    })
   


   } catch (error) {
    console.error("Error in customerInfo:", error);
    res.redirect("/pageerror");
}
};

const customerBlocked = async (req, res) => {
    try {
        let id = req.query.id;
        console.log("Blocking Customer ID:", id);
        if (!id) {
            return res.status(400).send("Customer ID is missing.");
        }
        await User.updateOne({_id: id}, {$set: {isBlocked: true}});
        res.redirect("/admin/users?blockSuccess=true");
    } catch (error) {
        res.redirect("/pageerror");
    }
};

const customerunBlocked = async (req, res) => {
    try {
        let id = req.query.id;
        await User.updateOne({_id: id}, {$set: {isBlocked: false}});
        res.redirect("/admin/users?unblockSuccess=true");
    } catch (error) {
        res.redirect("/pageerror");
    }
};




module.exports={
    customerInfo,
    customerBlocked,
    customerunBlocked,
};