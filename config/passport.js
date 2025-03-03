const passport = require('passport');
const User = require("../models/userSchema")
const GoogleStrategy = require('passport-google-oauth20').Strategy;
require('dotenv').config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: 'http://localhost:3002/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
    
          return done(null, user);
        } 

        user = new User({
          name: profile.displayName,
          email: profile.emails[0].value,
          googleId: profile.id
        });

        await user.save();

        return done(null, user); 

      } catch (error) {
        console.error("Error in Google Auth", error);
        return done(error, null);
      }
    }
  )
);

// user serialise && deserialise
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
