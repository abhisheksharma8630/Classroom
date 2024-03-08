
const passport = require('passport');
const LocalStrategy = require('passport-local');
const User = require('../models/user');
const GoogleStrategy = require('passport-google-oauth20');

passport.use(new LocalStrategy(User.authenticate()));
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback",
    scope: ["email", "profile"]
},
    async function (request, accessToken, refreshToken, profile, done) {
        try {
            let user = await User.findOne({ googleId: profile.id });
            if (!user) {
                const newUser = new User({
                    googleId: profile.id,
                    displayName: profile.displayName,
                    email: profile.emails[0].value,
                    username: profile.emails[0].value,
                });
                user = await newUser.save();
            }
            return done(null, user);
        } catch (error) {
            return done(error, null);
        }
}));
passport.serializeUser((user, done) => {
    done(null, user);
})
passport.deserializeUser((user, done) => {
    done(null, user);
})

