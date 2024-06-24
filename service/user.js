const bcrypt = require("bcrypt");
const User = require("../models/user");
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

  //----------------------------------------------------
  static async setUser(req, res, next) {
    try {
      const user = req.user;
      const dbUser = await User.findOne({
        //middleware isLoggedIn으로  req.user = decoded로 저장된 데이터 활용
        where: { id: user.id },
        attributes: ["id", "nickname", "email", "password"],
      });
      res.json(dbUser);
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  //----------------------------------------------------------------------
  static async logOut(req, res, next) {
    try {
      req.logout();
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).send("로그아웃 실패");
        }
        res.send("ok");
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
};
