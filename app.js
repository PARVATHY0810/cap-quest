const express =require('express');
const app=express();
const path = require("path");
//const env = require("dotenv").config();
const session = require("express-session");
const passport = require("./config/passport");
require("dotenv").config();
const db =require("./config/db")
const userRouter=require("./routes/userRouter")
const adminRouter=require("./routes/adminRouter") 
const nocache = require("nocache")
db()

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
       secure: false,
      httpOnly: true,
      maxAge: 72 * 60 * 60 * 1000
    }

}));

app.use(passport.initialize());
app.use(passport.session());

app.use(nocache())

app.set("view engine" ,"ejs");
app.set("views",[path.join(__dirname,'views/user'),path.join(__dirname,'views/admin')]);
//app.use(express.static("public"))
app.use(express.static(path.join(__dirname,"public")))


app.use("/",userRouter)
app.use("/admin",adminRouter)


const PORT=process.env.PORT || 4488;
app.listen(PORT,()=>{
  console.log(`server is running http://localhost:${PORT}`);
})

module.exports = app;