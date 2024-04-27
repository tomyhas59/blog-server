const passport = require("passport");
const User = require("../models/user");
const bcrypt = require("bcrypt");
const passportLocal = require("passport-local");
const LocalStrategy = passportLocal.Strategy;

const passportConfig = {
  usernameField: "email", //req.body.email 과 같음
  passwordField: "password",
  //밑에 async (email, password)와 같음
};

const passportVerify = async (email, password, done) => {
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return done(null, false, {
        messege: "가입된 이메일이 없습니다",
      });
    }

    const result = await bcrypt.compare(password, user.password); //password와 user.password 값 비교
    if (result) {
      return done(null, user); //두번째 인자가 성공or실패, 성공하면 정보 넘겨줌
    }
    return done(null, false, {
      messege: "비밀번호가 올바르지 않습니다",
    });
  } catch (err) {
    console.log(err);
    return done(err);
  }
};

module.exports = () => {
  passport.use("local", new LocalStrategy(passportConfig, passportVerify));
};
