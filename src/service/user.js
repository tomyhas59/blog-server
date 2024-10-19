const bcrypt = require("bcrypt");
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const Image = require("../models/image");
const fs = require("fs");
const path = require("path");

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
        include: [
          {
            model: User,
            as: "Followers",
            attributes: ["id", "nickname"],
          },
          {
            model: User,
            as: "Followings",
            attributes: ["id", "nickname"],
          },
          { model: Image, attributes: ["src"] },
        ],
        attributes: ["id", "nickname", "email", "password", "createdAt"],
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

      res.status(200).json(user);
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  //-----------------------------------------------------------
  static async createUserImage(req, res, next) {
    try {
      if (req.user.id) {
        if (req.file) {
          const existingImage = await Image.findOne({
            where: { UserId: req.user.id },
          });

          if (existingImage) {
            const imagePath = path.join(
              __dirname,
              "..",
              "uploads",
              existingImage.src
            );

            if (fs.existsSync(imagePath)) {
              fs.unlinkSync(imagePath);
            }

            existingImage.src = req.file.filename;
            await existingImage.save();

            res.status(200).json(existingImage);
          } else {
            const newImage = await Image.create({
              src: req.file.filename,
              UserId: req.user.id,
            });

            res.status(200).json(newImage);
          }
        }
      }
    } catch (err) {
      console.error(err);
      next(err); //status 500임
    }
  }
  //-----------------------------------------------------------
  static async getUserImage(req, res, next) {
    try {
      const image = await Image.findOne({ where: { UserId: req.user.id } });
      if (image && image.src) {
        res.status(200).json(image.src);
      } else {
        res.status(200).json(null);
      }
    } catch (err) {
      console.error(err);
      next(err);
    }
  }

  //-----------------------------------------------------------
  static async removeUserImage(req, res, next) {
    try {
      const image = await Image.findOne({ where: { UserId: req.user.id } });

      if (image && image.src) {
        const imagePath = path.join(__dirname, "../uploads", image.src);

        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
        await Image.destroy({ where: { UserId: req.user.id } });

        res.status(200).send("Image removed successfully.");
      }
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
        include: [
          {
            model: User,
            as: "Followers",
            attributes: ["id", "nickname"],
          },
          {
            model: User,
            as: "Followings",
            attributes: ["id", "nickname"],
          },
          { model: Image, attributes: ["src"] },
        ],
        attributes: ["id", "nickname", "email", "password", "createdAt"],
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
      const cookieOptions =
        process.env.NODE_ENV === "production"
          ? { httpOnly: true, secure: true, sameSite: "None" }
          : { httpOnly: true, sameSite: "Lax" };

      res.clearCookie("accessToken", cookieOptions);
      res.clearCookie("refreshToken", cookieOptions);
      res.send("ok");
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  //----------------------------------------------------------------------
  static async follow(req, res, next) {
    const userId = req.user.id;
    const followId = req.params.id;

    try {
      const user = await User.findByPk(userId);
      const follow = await User.findByPk(followId);

      if (!user || !follow) {
        return res.status(404).json({ message: "User not found" });
      }

      const existingFollow = await user.getFollowings({
        where: { id: followId },
      });

      if (existingFollow.length > 0) {
        return res.status(400).json({ message: "이미 팔로우했습니다" });
      }

      await user.addFollowings(follow);

      return res.status(200).json({
        UserId: follow.id,
        Nickname: follow.nickname,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

  static async unFollow(req, res, next) {
    const userId = req.user.id;
    const unFollowId = req.params.id;

    try {
      const user = await User.findByPk(userId);
      const unFollow = await User.findByPk(unFollowId);

      if (!user || !unFollow) {
        return res.status(404).json({ message: "User not found" });
      }

      await user.removeFollowings(unFollow.id);
      return res.status(200).json({
        UserId: unFollow.id,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
};
