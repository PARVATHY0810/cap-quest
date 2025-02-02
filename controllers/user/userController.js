
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


module.exports ={
  loadHomepage,
  pageNotFound,
  loadShopPage,
}