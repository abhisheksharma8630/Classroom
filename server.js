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



app.set("views",path.join(__dirname,"views"))
app.set("view engine","ejs");
app.engine("ejs",ejsMate);

app.use(express.static(path.join(__dirname,"/public")));
app.use(express.urlencoded({extended:true}));
app.use(methodOverride('_method'));
app.use(session({
    secret:"mysecretcode",
    resave:false,
    saveUninitialized:true,
    cookie:{
        expires: Date.now() + 7*24*60*60*1000,
        maxAge: 7*24*60*60*1000,
        httpOnly:true,
    }
}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.use(new GoogleStrategy({
    clientID: "742797280040-l3vg9rbs72ea0573bnsgmmbd86c30mt5.apps.googleusercontent.com",
    clientSecret:  "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",
    callbackURL: "http://localhost:3000/auth/google/callback",
    scope:["email","profile"]
    },
    async function(request,accessToken, refreshToken, profile, done) {
        try{
            let user = await User.findOne({googleId:profile.id});
            if(!user){
                const newUser = new User({
                googleId:profile.id,
                displayName:profile.displayName,
                email:profile.emails[0].value,
                username:profile.emails[0].value,
                });
                user = await newUser.save();
            }
            return done(null,user);
        }catch(error){
            return done(error,null);
        }
}));

passport.serializeUser((user,done)=>{
    done(null,user);
})
passport.deserializeUser((user,done)=>{
    done(null,user);
})



app.use((req,res,next)=>{
    res.locals.currUser = req.user;
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    next();
})

main().then(()=>{console.log("connected to database")}).catch(err => console.log(err));

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/classroom');
//   await mongoose.connect('mongodb+srv://as0755213:Abhi9760@cluster0.pshdmw9.mongodb.net/');
}

app.listen(3000,()=>{
    console.log("app is listening at port 3000");
})

const isLoggedIn = (req,res,next)=>{
    if(!req.isAuthenticated()){
        req.flash("error","You should login first !");
        return res.redirect("/");
    }else{
        next();
    }
}

const isUser =  async (req,res,next)=>{
    const {id} = req.params;
    if(id && req.user){
        let testUser = await test.findById(id);
        if(testUser.owner == req.user._id){
            next();
        }else{
            res.flash("error","You are not the owner of the test");
            next();
        }
    }else{
        res.flash("error","NO test exists!!");
        next();
    }
}

app.get('/', async (req,res)=>{
    const tests = await Test.find({}).populate({path: 'owner'});
    res.render('tests.ejs',{tests});
})

app.get('/login',(req,res)=>{
    res.render('./user/login.ejs');
})

app.get('/auth/google', passport.authenticate('google', { scope: ['profile','email'] }));

app.get('/auth/google/callback',passport.authenticate('google',{scope:['profile','email']}),function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/tests');
  });

app.post('/login',passport.authenticate("local",{failureRedirect:'/'}), (req,res)=>{
    res.redirect('/tests');
})



app.get('/logout',(req,res)=>{
    req.logOut((err)=>{
        if(err){
            console.log(err);
        }
    });
    req.flash("success","Successfully Logout");
    res.redirect('/');
})

app.get('/signup',(req,res)=>{
    res.render('./user/signup');
})

app.post('/signup', async (req,res)=>{
    try{
        const {username,password,email,displayName} = req.body;
        const registerUser = await User.register({username,email,displayName},password);
        req.login(registerUser,(err)=>{
            if(err){
                throw new Error(err);
            }
            res.redirect('/tests');
        });
    }catch(e){
        console.log(e)
        res.status(400).json('something broke');
    }
})

// test related apis


// all tests


// create test
app.get("/tests",isLoggedIn,(req,res)=>{
    res.render("./test/newTest.ejs");
})


app.post('/tests', isLoggedIn,async (req,res)=>{
    if(req.body.title == 0){
        res.status(400).send('please provide title');
    }
    const googleUser = await User.findOne({_id:req.user._id});
    let testBody = req.body;
    // testBody = {...testBody,liveAt : new Date(`${req.body.date[0]} ${req.body.date[1]}`)};
    testBody = {title: req.body.title,liveAt : new Date(req.body.date)};
    // console.log(testBody);
    const newtest = new Test(testBody);
    newtest.owner = googleUser._id;
    googleUser.tests.push(newtest);
    await googleUser.save();
    await newtest.save();
    res.redirect('/');
})


app.delete('/tests/:id',isLoggedIn,isUser,async(req,res)=>{
    const {id} = req.params;
    let temp = await test.findByIdAndDelete(id);
    console.log("deleted successfully");
    res.redirect('/');
})

app.get('/tests/:id',isLoggedIn,async (req,res)=>{
    const {id} = req.params;
    const test = await Test.findById(id).populate({path:'questions',populate:{path:"options"}});
    console.log(test);
    res.render('test.ejs',{test});
})




// add question to test
app.post('/tests/:id/question',isLoggedIn,async (req,res)=>{
    const {id} = req.params;
    const test = await Test.findById(id);
    const newQues = new Question(req.body);
    test.questions.push(newQues);
    await test.save();
    await newQues.save();
    res.redirect(`/tests/${id}`);
})

app.delete('/tests/:testID/question/:questionID',isLoggedIn,async (req,res)=>{
    const {testID,questionID} = req.params;
    await Question.findByIdAndDelete(questionID);
    res.status(200).json('yeah it worked');
})

app.post('/test/question',isLoggedIn, async (req,res)=>{
    const {question,correctAnswer,option} = req.body;
    const ques = new Question(req.body);
    try {
        await ques.save();
    } catch (error) {
        console.log(error);
        res.status(400).json(error);
    }
    res.status(200).json(req.body);
})


app.use((err,req,res,next)=>{
    if(err){
        res.status(400).render("Error.ejs",{message:err.message});
    }
})

app.all("*",(req,res)=>{
    res.status(400).json('Nah bro bad request !');
})