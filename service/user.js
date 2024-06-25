const bcrypt = require("bcrypt");
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const passport = require("passport");

module.exports = class UserService {
  static async signUp(req, res, next) {
    try {
      const exUser = await User.findOne({
        where: {
          email: req.body.email,
        },
      });
      const exNickname = await User.findOne({
        where: {
          nickname: req.body.nickname,
        },
      });
      if (exUser) {
        return res.status(403).send("이미 사용 중인 이메일입니다.");
      }
      if (exNickname) {
        return res.status(403).send("이미 사용 중인 닉네임입니다.");
      }
      const hashedPassword = await bcrypt.hash(req.body.password, 10); //패스워드 단방향 암호화
      await User.create({
        email: req.body.email,
        nickname: req.body.nickname,
        password: hashedPassword,
      });
      res.status(200).send("ok"); //200 성공, 201 잘 생성됨
    } catch (err) {
      console.error(err);
      next(err); //status 500임
    }
  }
  //----------------------------------------------------------------------

  static async logIn(req, res, next) {
    passport.authenticate("local", (err, user, message) => {
      if (err) {
        console.log(err);
        return next(err);
      }
      if (message) {
        return res.status(401).send(message);
      }
      return req.login(user, async (loginErr) => {
        if (loginErr) {
          console.error(err);
          return next(err);
        }
        const fullUser = await User.findOne({
          where: { id: user.id },
          attributes: {
            exclude: ["password"],
          },
        });
        return res.status(200).json(fullUser);
      });
    })(req, res, next);
  }

  //-------------------------------------------------------------------
  static async refreshToken(req, res, next) {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) return res.sendStatus(401);

    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
      const user = await User.findOne({ where: { id: decoded.id } });

      if (!user) {
        return res.status(401).send("유효하지 않은 리프레시 토큰");
      }

      const newAccessToken = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "15m" }
      );

      res.cookie("accessToken", newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      });

      res.status(200).json({ accessToken: newAccessToken });
    } catch (err) {
      console.error(err);
      res.status(401).send("유효하지 않은 리프레시 토큰");
    }
  }
  //----------------------------------------------------
  static async setUser(req, res, next) {
    try {
      const user = await User.findOne({
        //middleware isLoggedIn으로  req.user = decoded로 저장된 데이터 활용
        where: { email: req.user.email },
        attributes: ["id", "nickname", "email", "password"],
      });
      res.json(user);
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  //----------------------------------------------------------------------
  static async logOut(req, res, next) {
    try {
      req.logout();
      req.session.destroy();
      res.clearCookie("connect.sid"); // 세션 쿠키 제거
      res.send("ok");
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
};
