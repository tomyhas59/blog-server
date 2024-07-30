const express = require("express");
const router = express.Router();
const { isLoggedIn, isNotLoggedIn } = require("./middlewares");
const UserService = require("../service/user");
const upload = require("./multer");

router.post("/signup", UserService.signUp);
router.post("/login", isNotLoggedIn, UserService.logIn);
router.post(
  "/profileImage",
  isLoggedIn,
  upload.single("profileImage"),
  UserService.createUserImage
);
router.get("/profileImage", isLoggedIn, UserService.getUserImage);
router.delete("/profileImage", isLoggedIn, UserService.removeUserImage);
router.post("/logout", isLoggedIn, UserService.logOut);
router.post("/refreshToken", UserService.refreshToken);
router.get("/setUser", isLoggedIn, UserService.setUser);
router.patch("/:id/follow", isLoggedIn, UserService.follow);
router.delete("/:id/follow", isLoggedIn, UserService.unFollow);

module.exports = router;
