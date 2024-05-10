const jwt = require("jsonwebtoken");

exports.isLoggedIn = (req, res, next) => {
  if (!req.cookies.access_token) {
    return res.status(401).send("헤더에 쿠키가 없습니다.");
  }
  const tokenCookie = req.cookies.access_token;

  if (tokenCookie) {
    jwt.verify(tokenCookie, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).send("유효하지 않은 토큰입니다.");
      } else {
        req.user = decoded;
        console.log(decoded); // 디코딩된 페이로드를 req.user에 저장하여 다음 핸들러에서 사용할 수 있도록 합니다.
        next();
      }
    });
  } else {
    res.status(401).send("로그인이 필요합니다.");
  }
};

exports.isNotLoggedIn = (req, res, next) => {
  const tokenCookie = req.cookies.access_token;
  if (!tokenCookie) {
    next();
  } else {
    res.status(401).send("이미 로그인한 사용자는 접근할 수 없습니다.");
  }
};
