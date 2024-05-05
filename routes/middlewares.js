const jwt = require("jsonwebtoken");

exports.isLoggedIn = (req, res, next) => {
  // 쿠키에서 토큰을 추출합니다.
  const cookies = req.headers.cookie.split(";").map((cookie) => cookie.trim());
  const tokenCookie = cookies.find((cookie) =>
    cookie.startsWith("access_token=")
  );
  if (tokenCookie) {
    const token = tokenCookie.split("=")[1];
    // 토큰을 검증합니다.
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        // 토큰이 유효하지 않으면 401 Unauthorized를 응답합니다.
        return res.status(401).send("유효하지 않은 토큰입니다.");
      } else {
        // 토큰이 유효하면 다음 미들웨어로 이동합니다.
        req.user = decoded; // 디코딩된 페이로드를 req.user에 저장하여 다음 핸들러에서 사용할 수 있도록 합니다.
        next();
      }
    });
  } else {
    // 토큰이 없으면 401 Unauthorized를 응답합니다.
    res.status(401).send("로그인이 필요합니다.");
  }
};

exports.isNotLoggedIn = (req, res, next) => {
  // 쿠키에서 토큰을 추출합니다.
  const cookies = req.headers.cookie.split(";").map((cookie) => cookie.trim());
  const tokenCookie = cookies.find((cookie) =>
    cookie.startsWith("access_token=")
  );
  if (!tokenCookie) {
    // 토큰이 없으면 다음 미들웨어로 이동합니다.
    next();
  } else {
    // 토큰이 있으면 401 Unauthorized를 응답합니다.
    res.status(401).send("이미 로그인한 사용자는 접근할 수 없습니다.");
  }
};
