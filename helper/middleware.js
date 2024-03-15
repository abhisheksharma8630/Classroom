const Test = require('../models/test');

module.exports.isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.flash("error", "You should login first !");
        return res.redirect("/");
    } else {
        next();
    }
}

module.exports.isUser = async (req, res, next) => {
    const { id } = req.params;
    if (id && req.user) {
        let testUser = await Test.findById(id);
        if (testUser.owner == req.user._id) {
            next();
        } else {
            req.flash("error", "You are not the owner of the test");
            next(new Error("Yeh user hai hi nahi"));
        }
    } else {
        req.flash("error", "NO test exists!!");
        next();
    }
}

module.exports.isTeacher = (req,res,next)=>{
    if(req.user && req.user.occupation != 'teacher'){
        res.redirect('/student/homepage');
    }else{
        next();
    }
}
module.exports.isStudent = (req,res,next)=>{
    if(req.user && req.user.occupation != 'student'){
        res.redirect('/');
    }else{
        next();
    }
}

let generateUniqueCode = ()=>{
    return Math.floor(100000 + Math.random() * 900000); // Generates a random 6-digit number
}

let isCodeUnique= async (code)=>{
    const count = await Test.countDocuments({testCode:code});
    return count === 0;
}

// isCodeUnique(123121);

module.exports.getSixDigitCode = async()=>{
    let code;
    do {
        code = generateUniqueCode();
    } while (!await isCodeUnique(code));

    return code;
}

module.exports.shuffleArray=(array)=>{
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Swap elements
    }
    return array;
}
