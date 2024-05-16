/* const passport = require("passport");
const local = require("./local");
const User = require("../models/user");

module.exports = () => {
  //세션 생성
  passport.serializeUser((user, done) => {
    done(null, user.id); //첫 번째 인자 서버 에러, 두 번째 인자 성공or실패
    console.log(user.id);
  });

  //세션 데이터 해석 후 user 정보를 req.user에 담는 역할
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findOne({ where: { id } });
      done(null, user);
    } catch (err) {
      console.log(err);
      done(err);
    }
  });
  local();
};
 */
