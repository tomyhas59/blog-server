const bcrypt = require("bcrypt");
const User = require("../models/user");
const Post = require("../models/post");
const Comment = require("../models/comment");
const passport = require("passport");
const jwt = require("jsonwebtoken");

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
    try {
      const user = await User.findOne({
        where: {
          email: req.body.email,
        },
        attributes: ["id", "nickname", "email", "password"],
      });

      if (!user) {
        return res.status(401).send("가입되지 않은 이메일입니다.");
      }

      const isValidPassword = await bcrypt.compare(
        req.body.password,
        user.password
      );

      if (!isValidPassword) {
        return res.status(401).send("비밀번호가 틀렸습니다.");
      }

      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      res.cookie("access_token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
      });

      res.status(200).json({
        nickname: user.nickname,
        id: user.id,
        email: user.email,
        token,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  //----------------------------------------------------------------------

  /*  static async main(req, res, next) {
    console.log(req.headers); //headers 안에 쿠키 있음
    try {
      if (req.user) {
        const fullUserWithoutPassword = await User.findOne({
          where: { id: req.user.id },
          //attributes : ["id", "nickname", "email"], <- 이것만 가져오겠다
          attributes: {
            exclude: ["password"],
          },
          include: [
            {
              model: Post,
              attributes: ["id"],
            },
            {
              model: Comment,
              attributes: ["id"],
            },
          ],
        });
        res.status(200).json(fullUserWithoutPassword);
      } else {
        res.status(200).json(null);
      }
    } catch (error) {
      console.error(error);
      next(error);
    }
  } */
  //----------------------------------------------------------------------
  static async logOut(req, res, next) {
    try {
      res.clearCookie("access_token"); // access_token 쿠키 삭제
      res.send("ok");
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
};
