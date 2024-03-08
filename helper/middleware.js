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
            res.flash("error", "You are not the owner of the test");
            next(new Error("Yeh user hai hi nahi"));
        }
    } else {
        res.flash("error", "NO test exists!!");
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