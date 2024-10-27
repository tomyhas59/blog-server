import bcrypt from "bcrypt";
import { User } from "../models/user";
import jwt, { JwtPayload } from "jsonwebtoken";
import { Image } from "../models/image";
import fs from "fs";
import path from "path";
import { Request, Response, NextFunction, CookieOptions } from "express";

export default class UserService {
  // 회원가입 기능
  static async signUp(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | undefined> {
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
      const hashedPassword = await bcrypt.hash(req.body.password, 10); // 패스워드 단방향 암호화
      await User.create({
        email: req.body.email,
        nickname: req.body.nickname,
        password: hashedPassword,
      });
      res.status(200).send("ok"); // 200 성공
    } catch (err) {
      console.error(err);
      next(err); // status 500
    }
  }

  // 로그인 기능
  static async logIn(req: Request, res: Response, next: NextFunction) {
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
        process.env.JWT_SECRET as string,
        { expiresIn: "15m" }
      );
      const refreshToken = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET as string,
        { expiresIn: "7d" }
      );

      const cookieOptions: CookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // "None", "Lax", "Strict" 중 하나로 설정
      };

      res.cookie("accessToken", accessToken, cookieOptions);
      res.cookie("refreshToken", refreshToken, cookieOptions);

      res.status(200).json(user);
    } catch (err) {
      console.error(err);
      next(err);
    }
  }

  // 사용자 이미지 생성
  static async createUserImage(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
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
      next(err); // status 500
    }
  }

  // 사용자 이미지 조회
  static async getUserImage(req: Request, res: Response, next: NextFunction) {
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

  // 사용자 이미지 삭제
  static async removeUserImage(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const image = await Image.findOne({ where: { UserId: req.user.id } });

      if (image && image.src) {
        const imagePath = path.join(__dirname, "../uploads", image.src);

        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
        await Image.destroy({ where: { UserId: req.user.id } });

        res.status(200).send("이미지가 성공적으로 삭제되었습니다.");
      }
    } catch (err) {
      console.error(err);
      next(err);
    }
  }

  // 리프레시 토큰 갱신
  static async refreshToken(req: Request, res: Response, next: NextFunction) {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) return res.sendStatus(401);

    try {
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_SECRET as string
      ) as JwtPayload;
      const user = await User.findOne({ where: { id: decoded.id } });

      if (!user) {
        return res.status(401).send("유효하지 않은 리프레시 토큰");
      }

      const newAccessToken = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET as string,
        { expiresIn: "15m" }
      );

      res.cookie("accessToken", newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      });

      res.status(200).json({ accessToken: newAccessToken });
    } catch (err) {
      console.error(err);
      res.status(401).send("유효하지 않은 리프레시 토큰");
    }
  }

  // 사용자 정보 설정
  static async setUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await User.findOne({
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

  // 로그아웃 기능
  static async logOut(req: Request, res: Response, next: NextFunction) {
    try {
      const cookieOptions =
        process.env.NODE_ENV === "production"
          ? { httpOnly: true, secure: true, sameSite: "none" as const }
          : { httpOnly: true, sameSite: "lax" as const };

      res.clearCookie("accessToken", cookieOptions);
      res.clearCookie("refreshToken", cookieOptions);
      res.send("ok");
    } catch (err) {
      console.error(err);
      next(err);
    }
  }

  // 팔로우 기능
  static async follow(req: Request, res: Response, next: NextFunction) {
    const userId = req.user.id;
    const followId = req.params.id;

    try {
      const user = await User.findByPk(userId);
      const follow = await User.findByPk(followId);

      if (!user || !follow) {
        return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
      }

      const existingFollow = await (user.getFollowings as any)({
        where: { id: followId },
      });

      if (existingFollow.length > 0) {
        return res.status(400).json({ message: "이미 팔로우했습니다." });
      }

      await user.addFollowings(follow);

      return res.status(200).json({
        UserId: follow.id,
        Nickname: follow.nickname,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "내부 서버 오류" });
    }
  }

  // 언팔로우 기능
  static async unFollow(req: Request, res: Response, next: NextFunction) {
    const userId = req.user.id;
    const unFollowId = req.params.id;

    try {
      const user = await User.findByPk(userId);
      const unFollow = await User.findByPk(unFollowId);

      if (!user || !unFollow) {
        return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
      }

      const existingFollow = await (user.getFollowings as any)({
        where: { id: unFollowId },
      });

      if (existingFollow.length === 0) {
        return res.status(400).json({ message: "팔로우하지 않았습니다." });
      }

      await user.removeFollowings(unFollow);
      return res.status(200).json({
        UserId: unFollow.id,
        Nickname: unFollow.nickname,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "내부 서버 오류" });
    }
  }
}
