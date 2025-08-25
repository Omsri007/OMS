// const passport = require('passport');
// const GoogleStrategy = require('passport-google-oauth20').Strategy;
// const mongoose = require('mongoose');
// const userSchema = require('../models/Admin');
// const fs = require('fs');
// const path = require('path');
// const { saveToken, saveGmailAccountInfo } = require('../auth/authClient');

// const credentialsPath = path.join(__dirname, '..', 'auth', 'credentials.json');
// const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));

// const { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web;

// let User;

// exports.setPassportDB = (db) => {
//   User = db.model('User', userSchema);

//   passport.use(
//     new GoogleStrategy(
//       {
//         clientID: client_id,
//         clientSecret: client_secret,
//         callbackURL: redirect_uris[0],
//       },
//       async (accessToken, refreshToken, profile, done) => {
//         try {
//           const email = profile.emails?.[0]?.value;
//           if (!email) return done(new Error("Email not found in Google profile"));

//           let user = await User.findOne({ email });
//           if (!user) {
//             user = new User({
//               email,
//               googleId: profile.id,
//               isVerified: true,
//             });
//             await user.save();
//           }

//           // ✅ Save Gmail info and token
//           await saveGmailAccountInfo(email);
//           await saveToken(email, {
//             access_token: accessToken,
//             refresh_token: refreshToken,
//           });

//           return done(null, { id: user._id, email: user.email });
//         } catch (err) {
//           return done(err, null);
//         }
//       }
//     )
//   );

//   passport.serializeUser((user, done) => {
//     done(null, user.id);
//   });

//   passport.deserializeUser(async (id, done) => {
//     try {
//       const user = await User.findById(id);
//       if (!user) return done(null, false);
//       done(null, { id: user._id, email: user.email });
//     } catch (err) {
//       done(err, null);
//     }
//   });
// };
