const express = require("express");
const app  = express();
const mongoose = require("mongoose");
const ejs = require("ejs");
const MONGO_URL = "mongodb://127.0.0.1:27017/health_care";
const passport = require("passport");
const passportLocal = require("passport-local");
const User = require("./models/users.js")
const LocalStrategy = require("passport-local");
const flash = require("connect-flash");

const userRouter = require("./routes/user.js");

// Body parsing middleware - MUST come before routes
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static files from public directory
app.use(express.static('public'));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', './views');

main().then(() => {
    console.log("Connected to database");
}).catch((err) => {
    console.log(err);
})

async function main(){
    await mongoose.connect(MONGO_URL);
}

// Express session and passport configuration - MUST come before routes
app.use(require('express-session')({ secret: 'keyboard cat', resave: true, saveUninitialized: true }));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use("/",userRouter);
app.get("/",(req,res) => {
    res.render("dashboards/home.ejs", {
        successMessage: req.flash('success')[0] || null,
        errorMessage: req.flash('error')[0] || null
    });
})

// app.get("/demouser",async(req,res) => {
//     let fakeUser  = new User({
//         email:"demo@gmail.com",
//         username : "demouser1"
//     });
//     let registeredUser =await User.register(fakeUser,"12345678");
//     res.send(registeredUser);
// });

app.listen(8080,() =>{
    console.log("Server is listening on port 8080")
});