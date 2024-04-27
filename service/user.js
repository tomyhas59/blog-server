const bcrypt = require("bcrypt");
const User = require("../models/user");
const Post = require("../models/post");
const Comment = require("../models/comment");
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
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.log(err);
        return next(err);
      }
      if (!user) {
        return res.status(401).send(info.messege);
      }

      /*login 실행 함수 , passport에서 가져옴*/
      return req.login(user, async (loginErr) => {
        if (loginErr) {
          console.error(loginErr);
          return next(loginErr);
        }
        const fullUser = await User.findOne({
          where: { id: user.id },
          attributes: {
            exclude: ["password"],
          },
        });
        return res.status(200).json(fullUser);
      });
    })(req, res, next); //이걸 써줘야 passport로 전달됨
  }
  //----------------------------------------------------------------------

  static async main(req, res, next) {
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
  }
  //----------------------------------------------------------------------

  static async logOut(req, res, next) {
    req.logout();
    req.session.destroy();
    res.send("ok");
  }
  catch(err) {
    next(err);
  }
};
