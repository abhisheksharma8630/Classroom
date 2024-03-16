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
const {isLoggedIn , isUser, isTeacher,isStudent ,getSixDigitCode, shuffleArray} = require("./helper/middleware");



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


app.get("/",(req,res)=>{
    if(req.user && req.user.occupation == "teacher"){
        res.redirect('/teacher');
    }else if(req.user && req.user.occupation == "student"){
        res.redirect('/student');
    }else{
        res.render('homepage.ejs');
    }
})


app.get('/login', (req, res) => {
    res.render('./user/login.ejs');
})

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', passport.authenticate('google', { scope: ['profile', 'email'] }), function (req, res) {
    if(req.user && req.user.occupation == "none"){
        res.redirect('/occupation');
    }else if(req.user && req.user.occupation == "teacher"){
        res.redirect('/teacher');
    }else{
        res.redirect('/student');
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
0
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
            if(err) {
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

app.get("/student",isStudent, async(req,res)=>{
    const tests = await Test.find({}).populate({ path: 'owner' });
    res.render('./student/homepage',{tests});
})

app.get('/teacher',isLoggedIn,isTeacher,async (req, res) => {
    const tests = await Test.find({}).populate({ path: 'owner' });
    res.render('./teacher/newTest.ejs', { tests });
})



// test related apis


// all tests

app.get('/tests',isLoggedIn,async(req,res)=>{
    let { code } = req.query;
    let test = await Test.findOne({testCode:code}).populate({path: 'questions', populate: { path: "options" } });
    if(test){
        res.render('testToAttend',{test});
    }else{
        res.json("no such test exits");
    }
})

app.post('/tests',isLoggedIn,async(req,res)=>{
    let {testId} = req.query;
    let {attendee} = req.body;
    let totalMarks = 0;
    let attemptedQuestions = req.body;
    delete attemptedQuestions['attendee'];
    for(let key in attemptedQuestions){
        let attQuestion = await Question.findById(key);
        if(attQuestion.correctAnswer == attemptedQuestions[key]){
            totalMarks++;
        }
    }
    let attemptedTest = await Test.findById(testId);
    attemptedTest.attendees.push({user:req.user,name:attendee,marks:totalMarks});
    let userWhoAttended = await User.findById(req?.user._id);
    userWhoAttended.attended.push(attemptedTest._id);
    let temp1 = await userWhoAttended.save();
    let temp = await attemptedTest.save();
    // res.json({"user":temp1,"test":temp});
    res.redirect('/');
})


app.post('/teacher/tests', isLoggedIn, async (req, res) => {
    if (req.body.title == 0) {
        res.status(400).send('please provide title');
    }
    const googleUser = await User.findOne({ _id: req.user._id });
    let testBody = req.body;
    let code = await getSixDigitCode ();
    console.log(code);
    testBody = { title: req.body.title, liveAt: new Date(req.body.date),testCode:code};
    const newtest = new Test(testBody);
    newtest.owner = googleUser._id;
    googleUser.tests.push(newtest);
    await googleUser.save();
    await newtest.save();
    res.redirect('/teacher');
})


app.delete('/tests/:id', isLoggedIn, isUser, async (req, res) => {
    const { id } = req.params;
    let temp = await test.findByIdAndDelete(id);
    await User.findByIdAndUpdate(temp.owner, { $pull: { tests: id } });
    console.log("deleted successfully");
    res.redirect('/');
})

app.get('/teacher/tests/:id',isLoggedIn,isUser,async (req, res) => {
    const { id } = req.params;
    const test = await Test.findById(id).populate({ path: 'questions', populate: { path: "options" } });
    console.log(test);
    res.render('./teacher/test.ejs', { test,question:false });
})




// add question to test

app.post('/tests/:id/question', isLoggedIn, async (req, res) => {
    const { id } = req.params;
    const test = await Test.findById(id);
    let {question,options} = req.body;
    let correctAnswer = options[0];
    options = shuffleArray(options);
    const newQues = new Question({question,options,correctAnswer,test:id});
    console.log(newQues);
    test.questions.push(newQues);
    await test.save();
    await newQues.save();
    res.redirect(`/teacher/tests/${id}`);
})

app.get('/tests/:testID/question/:questionID',async (req,res)=>{
    let { testID, questionID} = req.params;
    const test = await Test.findById(testID).populate({ path: 'questions', populate: { path: "options" } });
    const question = await Question.findById(questionID).populate({path:'options'});
    for(let i=1;i<4;i++){
        if(question.options[i]== question.correctAnswer){
            question.options[i] = question.options[0];
            question.options[0] = question.correctAnswer;
        }
    }
    console.log(question);
    res.render('./teacher/test.ejs', { test ,question});
})

app.delete('/tests/:testID/question/:questionID', isLoggedIn, async (req, res) => {
    const { testID, questionID } = req.params;
    await Test.findByIdAndUpdate(testID, { $pull: { questions: questionID } });
    let temp = await Question.findByIdAndDelete(questionID);
    res.redirect(`/tests/${testID}`)
})

app.patch('/tests/:testID/question/:questionID', isLoggedIn, async (req, res) => {
    const { testID, questionID } = req.params;
    let {question,options } = req.body;
    let correctAnswer = options[0];
    options = shuffleArray(options);
    let temp = await Question.findByIdAndUpdate(questionID,{question,correctAnswer,options});
    console.log(temp)
    res.redirect(`/teacher/tests/${testID}`)
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