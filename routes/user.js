const express = require("express");
const router = express.Router();
const { isLoggedIn, isNotLoggedIn } = require("./middlewares");
const UserService = require("../service/user");
const User = require("../models/user");

router.post("/signup", UserService.signUp);
router.post("/login", isNotLoggedIn, UserService.logIn);
router.post("/logout", isLoggedIn, UserService.logOut);
router.post("/refreshToken", UserService.refreshToken);
router.get("/setUser", isLoggedIn, UserService.setUser);

module.exports = router;
