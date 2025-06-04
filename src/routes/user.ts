import express from "express";
import { isLoggedIn, isNotLoggedIn } from "./middlewares";
import UserService from "../service/user";
import upload from "./multer";

const router = express.Router();

router.post("/signup", UserService.signUp);
router.post("/login", isNotLoggedIn, UserService.logIn);
router.post(
  "/profileImage",
  isLoggedIn,
  upload.single("profileImage"),
  UserService.createUserImage
);

router.get("/", UserService.getUserInfo);

router.post("/modifyNickname", isLoggedIn, UserService.modifyNickname);
router.post("/changePassword", isLoggedIn, UserService.changePassword);
router.get("/profileImage", isLoggedIn, UserService.getUserImage);
router.delete("/profileImage", isLoggedIn, UserService.removeUserImage);
router.post("/logout", isLoggedIn, UserService.logOut);
router.post("/refreshToken", UserService.refreshToken);
router.get("/setUser", isLoggedIn, UserService.setUser);

router.patch("/:id/follow", isLoggedIn, UserService.follow);
router.delete("/:id/follow", isLoggedIn, UserService.unFollow);
router.get(
  "/getNewFollowersCount",
  isLoggedIn,
  UserService.getNewFollowersCount
);

export default router;
