import bcrypt from "bcrypt";
import { User } from "../models/user";
import jwt, { JwtPayload } from "jsonwebtoken";
import { Image } from "../models/image";
import fs from "fs";
import path from "path";
import { Request, Response, NextFunction, CookieOptions } from "express";
import { exportJWK } from "jose";
import { Notification } from "./../models/notification";
import { Op } from "sequelize";
import { Post } from "../models/post";

export default class UserService {
  // 회원가입 기능
  static async signUp(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
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
        res.status(403).send("이미 사용 중인 이메일입니다.");
        return;
      }
      if (exNickname) {
        res.status(403).send("이미 사용 중인 닉네임입니다.");
        return;
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
  static async logIn(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
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
          { model: Notification, attributes: ["id", "isRead", "type"] },
        ],
        attributes: ["id", "nickname", "email", "password", "createdAt"],
      });

      if (!user) {
        res.status(401).send("가입되지 않은 이메일입니다.");
        return;
      }

      const isValidPassword = await bcrypt.compare(
        req.body.password,
        user.password
      );

      if (!isValidPassword) {
        res.status(401).send("비밀번호가 틀렸습니다.");
        return;
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

      req.user = {
        id: user.id,
        nickname: user.nickname,
        email: user.email,
      };

      res.cookie("accessToken", accessToken, cookieOptions);
      res.cookie("refreshToken", refreshToken, cookieOptions);

      //user.toJSON()을 호출하여 순수 JSON 객체 생성
      //password를 제외
      const { password, ...userWithoutPassword } = user.toJSON();

      console.log(userWithoutPassword);
      res
        .status(200)
        .json({ user: userWithoutPassword, accessToken, refreshToken });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }

  //닉네임 변경

  static async modifyNickname(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const newNickname = req.body.newNickname;
      const user = req.user as User;

      console.log("--------------", user, newNickname);
      if (!user.id) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const existingUser = await User.findByPk(user.id);
      if (!existingUser) {
        res.status(404).json({ message: "User not found" });
        return;
      }
      existingUser.nickname = newNickname;

      await existingUser.save();
      res.status(200).send("ok"); // 200 성공
    } catch (err) {
      console.error(err);
    }
  }
  //비밀번호 변경
  static async changePassword(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { prevPassword, newPassword } = req.body;
      const user = req.user as User;

      if (!user.id) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const existingUser = await User.findByPk(user.id);
      if (!existingUser) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      const isMatch = await bcrypt.compare(prevPassword, existingUser.password);
      if (!isMatch) {
        res.status(400).json({ message: "비밀번호가 다릅니다." });
        return;
      }

      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      existingUser.password = hashedNewPassword;
      await existingUser.save();

      res.status(200).send("ok"); // 200 성공
    } catch (err) {
      console.error(err);
      next(err); // status 500
    }
  }

  // 사용자 이미지 생성
  static async createUserImage(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const user = req.user as User;
      if (user.id) {
        if (req.file) {
          const existingImage = await Image.findOne({
            where: { UserId: user.id },
          });

          if (existingImage) {
            const imagePath = path.join(
              __dirname,
              "../../uploads",
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
              UserId: user.id,
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
      const user = req.user as User;
      const image = await Image.findOne({ where: { UserId: user.id } });
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
      const user = req.user as User;
      const image = await Image.findOne({ where: { UserId: user.id } });

      if (image && image.src) {
        const imagePath = path.join(__dirname, "../../uploads", image.src);

        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
        await Image.destroy({ where: { UserId: user.id } });

        res.status(200).send("이미지가 성공적으로 삭제되었습니다.");
      }
    } catch (err) {
      console.error(err);
      next(err);
    }
  }

  // 리프레시 토큰 갱신
  static async refreshToken(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      res.sendStatus(401);
      return;
    }

    try {
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_SECRET as string
      ) as JwtPayload;
      const user = await User.findOne({ where: { id: decoded.id } });

      if (!user) {
        res.status(401).send("유효하지 않은 리프레시 토큰");
        return;
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
      const user = req.user as User;
      const existingUser = await User.findOne({
        where: { email: user.email },
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
          { model: Notification, attributes: ["id", "isRead", "type"] },
        ],
        attributes: ["id", "nickname", "email", "password", "createdAt"],
      });

      if (!existingUser) {
        res.status(401).send("유저 정보가 없습니다.");
        return;
      }

      //user.toJSON()을 호출하여 순수 JSON 객체 생성
      //password를 제외
      const { password, ...userWithoutPassword } = existingUser.toJSON();

      res.json(userWithoutPassword);
    } catch (err) {
      console.error(err);
      next(err);
    }
  }

  //사용자 정보 가져오기

  static async getUserInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.query.userId;

      // userId를 string으로 강제 변환
      const validUserId = Array.isArray(userId)
        ? userId[0]
        : (userId as string);

      const existingUser = await User.findOne({
        where: { id: validUserId },
        include: [
          {
            model: Post,
            attributes: ["title", "content", "id"],
            include: [
              {
                model: Image,
                attributes: ["src"],
              },
            ],
          },
          {
            model: User,
            as: "Followers",
            attributes: ["id", "nickname"],
            include: [
              {
                model: Image,
                attributes: ["src"],
              },
            ],
          },
          {
            model: User,
            as: "Followings",
            attributes: ["id", "nickname"],
            include: [
              {
                model: Image,
                attributes: ["src"],
              },
            ],
          },
          { model: Image, attributes: ["src"] },
        ],
        attributes: ["id", "nickname", "email"],
      });

      if (!existingUser) {
        res.status(401).send("유저 정보가 없습니다.");
        return;
      }

      res.json(existingUser);
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
  static async follow(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const user = req.user as User;
    const userId = user.id;
    const followId = req.params.id;

    try {
      const user = await User.findByPk(userId);
      const follow = await User.findByPk(followId);

      if (!user || !follow) {
        res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
        return;
      }

      const existingFollow = await (user.getFollowings as any)({
        where: { id: followId },
      });

      if (existingFollow.length > 0) {
        res.status(400).json({ message: "이미 팔로우했습니다." });
        return;
      }

      await Notification.create({
        UserId: follow.id, // 팔로우 대상 유저에게 알림 전송
        type: "FOLLOW",
        message: `${user.nickname}님이 당신을 팔로우했습니다.`,
        isRead: false,
      });

      await user.addFollowings(follow);

      res.status(200).json({
        UserId: follow.id,
        Nickname: follow.nickname,
      });
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "내부 서버 오류" });
      exportJWK;
    }
  }

  // 언팔로우 기능
  static async unFollow(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const user = req.user as User;
    const userId = user.id;
    const unFollowId = req.params.id;

    try {
      const user = await User.findByPk(userId);
      const unFollow = await User.findByPk(unFollowId);

      if (!user || !unFollow) {
        res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
        return;
      }

      const existingFollow = await (user.getFollowings as any)({
        where: { id: unFollowId },
      });

      if (existingFollow.length === 0) {
        res.status(400).json({ message: "팔로우하지 않았습니다." });
        return;
      }

      await Notification.destroy({
        where: {
          UserId: unFollow.id, // 팔로우를 받은 사람
          message: {
            [Op.like]: `%${user.nickname}%`,
          },
        },
      });

      await user.removeFollowings(unFollow);
      res.status(200).json({
        UserId: unFollow.id,
        Nickname: unFollow.nickname,
      });
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "내부 서버 오류" });
      return;
    }
  }

  static async getNewFollowersCount(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const userId = Number(req.query.userId);

    try {
      const newFollowers = await Notification.count({
        where: {
          UserId: userId,
          type: "FOLLOW",
          isRead: false,
        },
      });
      res.json(newFollowers);
    } catch (err) {
      console.error(err);
    }
  }
}
