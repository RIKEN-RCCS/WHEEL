"use strict";
const path = require('path');
const express = require('express');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

const {admin} = require('../db/db');

passport.use(new LocalStrategy(
  {
    usernameField: 'id',
    passwordField: 'password',
    passReqToCallback: true
  },
  (req, username, password, done)=>{
    let account = userAccount.query('id', username);
    console.log(username, password);
    if(!account){
      req.flash('error', 'invalid user id');
      return done(null, false);
    }
    //TODO passwordをhashで保存するように変更した上で、hash後の値を比較
    if(account.pw!== password){
      req.flash('error', 'invalid password');
      return done(null, false);
    }
    return done(null, username);
  }));

const router = express.Router();
router.get('/', (req, res)=>{
  res.sendFile(path.resolve(__dirname, '../views/login.html'));
});
router.post('/',
  passport.authenticate('local', {failureRedirect: '/login'}),
    (req, res)=>{
      if(req.user === admin){
        return res.redirect('/admin');
      }else{
        return res.redirect('/home');
      }
    });
module.exports = router;
