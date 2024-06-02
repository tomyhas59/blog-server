const bcrypt = require("bcrypt");
const User = require("../models/user");
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

      const accessToken = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "15m" }
      );
      const refreshToken = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      const cookieOptions =
        process.env.NODE_ENV === "production"
          ? { httpOnly: true, secure: true, sameSite: "None" }
          : { httpOnly: true, sameSite: "Lax" };

      res.cookie("accessToken", accessToken, cookieOptions);
      res.cookie("refreshToken", refreshToken, cookieOptions);

      res.status(200).json({
        nickname: user.nickname,
        id: user.id,
        email: user.email,
        accessToken,
        refreshToken,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
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
      res.clearCookie("accessToken"); // access_token 쿠키 삭제
      res.clearCookie("refreshToken"); // refresh_token 쿠키 삭제
      res.send("ok");
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
};
