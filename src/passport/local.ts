import { Strategy as LocalStrategy } from "passport-local";
import passport from "passport";
import bcrypt from "bcrypt";
import { User } from "../models/user";

const passportConfig = {
  usernameField: "email", // req.body.email과 같음
  passwordField: "password",
};

const passportVerify = async (
  email: string,
  password: string,
  done: (err: any, user?: any, info?: any) => void
) => {
  try {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return done(null, false, {
        message: "가입된 이메일이 없습니다.",
      });
    }

    const result = await bcrypt.compare(password, user.password); // password와 user.password 값 비교
    if (result) {
      return done(null, user); // 두 번째 인자가 성공 또는 실패, 성공하면 정보 넘겨줌
    }

    return done(null, false, {
      message: "비밀번호가 올바르지 않습니다.",
    });
  } catch (err) {
    console.error(err);
    return done(err);
  }
};

export default () => {
  passport.use("local", new LocalStrategy(passportConfig, passportVerify));
};
