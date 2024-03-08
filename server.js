require('dotenv').config();
const express = require("express");
const app = express();
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const ejsMate = require('ejs-mate');
const mongoose = require('mongoose');
const Question = require('./models/question');
const Test = require('./models/test');
const methodOverride = require('method-override');
const test = require("./models/test");
const passport = require('passport');
const LocalStrategy = require('passport-local');
const GoogleStrategy = require('passport-google-oauth20');
const User = require('./models/user');
const {isLoggedIn , isUser, isTeacher,isStudent} = require("./helper/middleware");



app.set("views", path.join(__dirname, "views"))
app.set("view engine", "ejs");
app.engine("ejs", ejsMate);

app.use(express.static(path.join(__dirname, "/public")));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(session({
    secret: "mysecretcode",
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
    }
}));

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
require('./helper/auth');


app.use((req, res, next) => {
    res.locals.currUser = req.user;
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    next();
})

main().then(() => { console.log("connected to database") }).catch(err => console.log(err));

async function main() {
    await mongoose.connect('mongodb://127.0.0.1:27017/classroom');
    //   await mongoose.connect('mongodb+srv://as0755213:Abhi9760@cluster0.pshdmw9.mongodb.net/');
}

app.listen(3000, () => {
    console.log("app is listening at port 3000");
})


app.get('/', isTeacher,async (req, res) => {
    const tests = await Test.find({}).populate({ path: 'owner' });
    res.render('./test/newTest.ejs', { tests });
})

app.get('/login', (req, res) => {
    res.render('./user/login.ejs');
})

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', passport.authenticate('google', { scope: ['profile', 'email'] }), function (req, res) {
    if(req.user && req.user.occupation == "none"){
        res.redirect('/occupation');
    }else if(req.user && req.user.occupation == "teacher"){
        res.redirect('/');
    }else{
        res.redirect('/student/homepage');
    }
});

app.post('/login', passport.authenticate("local", { failureRedirect: '/' }), (req, res) => {
    req.flash("success","Successfully logged in");
    if(req.user &&  req.user.occupation == 'teacher'){
        res.redirect('/');
    }else{
        res.redirect('/student/homepage');
    }
})



app.get('/logout', (req, res) => {
    req.logOut((err) => {
        if (err) {
            console.log(err);
        }
    });
    req.flash("error", "Successfully Logout");
    res.redirect('/');
})

app.get('/occupation',isLoggedIn,(req,res)=>{
    res.render("occupation.ejs");
})

app.post('/occupation',isLoggedIn,async (req,res)=>{
    if(req.user && req.user.occupation == "none"){
        let updatedUser = await User.findOneAndUpdate({_id:req.user._id},{occupation:req.body.occupation});
        req.user = updatedUser;
    }

    if(req.user.occupation=="teacher"){
        res.redirect("/");
    }else{
        res.redirect("/student/homepage");
    }
})

app.get('/signup', (req, res) => {
    res.render('./user/signup');
})

app.post('/signup', async (req, res) => {
    try {
        let { username, password, email, displayName,occupation } = req.body;
        const registerUser = await User.register({ username, email, displayName, occupation}, password);        
        req.login(registerUser, (err) => {
            if (err) {
                throw new Error(err);
            }
            if(req.user && req.user.occupation == 'teacher'){
                res.redirect('/');
            }else{
                res.redirect('/student/homepage');
            }
        });
    } catch (e) {
        console.log(e)
        res.status(400).json('something broke');
    }
})

// Student related API

app.get("/student/homepage",isStudent,(req,res)=>{
    res.render('./student/homepage');
})



// test related apis


// all tests


app.post('/tests', isLoggedIn, async (req, res) => {
    if (req.body.title == 0) {
        res.status(400).send('please provide title');
    }
    const googleUser = await User.findOne({ _id: req.user._id });
    let testBody = req.body;
    testBody = { title: req.body.title, liveAt: new Date(req.body.date) };
    const newtest = new Test(testBody);
    newtest.owner = googleUser._id;
    googleUser.tests.push(newtest);
    await googleUser.save();
    await newtest.save();
    res.redirect('/');
})


app.delete('/tests/:id', isLoggedIn, isUser, async (req, res) => {
    const { id } = req.params;
    let temp = await test.findByIdAndDelete(id);
    console.log(temp);
    await User.findByIdAndUpdate(temp.owner, { $pull: { tests: id } });
    console.log("deleted successfully");
    res.redirect('/');
})

app.get('/tests/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params;
    const test = await Test.findById(id).populate({ path: 'questions', populate: { path: "options" } });
    console.log(test);
    res.render('./test/test.ejs', { test });
})




// add question to test


app.post('/tests/:id/question', isLoggedIn, async (req, res) => {
    const { id } = req.params;
    const test = await Test.findById(id);
    const newQues = new Question(req.body);
    test.questions.push(newQues);
    await test.save();
    await newQues.save();
    res.redirect(`/tests/${id}`);
})

app.delete('/tests/:testID/question/:questionID', isLoggedIn, async (req, res) => {
    const { testID, questionID } = req.params;
    await Question.findByIdAndDelete(questionID);
    res.status(200).json('yeah it worked');
})

app.post('/test/question', isLoggedIn, async (req, res) => {
    const { question, correctAnswer, option } = req.body;
    const ques = new Question(req.body);
    try {
        await ques.save();
    } catch (error) {
        console.log(error);
        res.status(400).json(error);
    }
    res.status(200).json(req.body);
})


app.use((err, req, res, next) => {
    if (err) {
        res.status(400).render("Error.ejs", { message: err.message });
    }
})



app.all("*", (req, res) => {
    res.status(400).json('Nah bro bad request !');
})