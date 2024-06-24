const express = require("express");
const router = express.Router();
const { isLoggedIn, isNotLoggedIn } = require("./middlewares");
const UserService = require("../service/user");

router.post("/signup", UserService.signUp);
router.post("/login", isNotLoggedIn, UserService.logIn);
router.post("/logout", isLoggedIn, UserService.logOut);

module.exports = router;
