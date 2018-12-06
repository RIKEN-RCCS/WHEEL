"use strict";
const path = require("path");
const fs = require("fs");
const { promisify } = require("util");
const express = require("express");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");
const { admin, userAccount } = require("../db/db");
const { getLogger } = require("../logSettings");
const logger = getLogger("login");
passport.use(new LocalStrategy(
  (username, password, done)=>{
    const account = userAccount.query("name", username);

    if (!account) {
      return done(null, false, { message: "invalid user id" });
    }
    bcrypt.compare(password, account.password, (err, result)=>{
      if (result) {
        return done(null, username);
      }
      return done(null, false, { message: "invalid password" });
    });
  }
));

passport.serializeUser((user, done)=>{
  done(null, user.id);
});

//passport.deserializeUser(function(id, done) {
//User.findById(id, function(err, user) {
//done(err, user);
//});
//});

//eslint-disable-next-line new-cap
const router = express.Router();
router.get("/", (req, res)=>{
  res.sendFile(path.resolve(__dirname, "../views/login.html"));
});
router.post("/", (req, res, next)=>{
  passport.authenticate("local", async(err, user, info)=>{
    //exception occurred
    if (err) {
      return next(err);
    }

    //authentication failed
    if (!user) {
      logger.warn("authentication failed", info);
      let html = await promisify(fs.readFile)(path.resolve(__dirname, "../views/login.html"));
      html = html.toString().replace("<div id=\"errorMessage\"></div>",
        "<div id=\"errorMessage\">invalid username or password</div>");
      return res.send(html);
    }
    res.cookie("user", user);
    const url = user === admin ? "/admin" : "/home";
    return res.redirect(url);
  })(req, res, next);
});
module.exports = router;
