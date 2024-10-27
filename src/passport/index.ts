import passport from "passport";
import local from "./local";
import { User } from "../models/user";

export default () => {
  // 세션 생성
  passport.serializeUser((user: any, done: (err: any, id?: number) => void) => {
    done(null, user.id); // user.id를 사용하여 세션에 사용자 ID 저장
    console.log(user.id);
  });

  // 세션 데이터 해석 후 user 정보를 req.user에 담는 역할
  passport.deserializeUser(
    async (id: number, done: (err: any, user: User | null) => void) => {
      try {
        const user = await User.findOne({ where: { id } });
        done(null, user); // User 타입을 그대로 사용
      } catch (err) {
        console.error(err);
        done(err, null);
      }
    }
  );

  local();
};
