const jwt = require("jsonwebtoken");

exports.isLoggedIn = (req, res, next) => {
  const headerCookies = req.headers.cookie;

  const getCookieValue = (cookieString, cookieName) => {
    const name = `${cookieName}=`;
    const parts = cookieString.split(";");
    for (let part of parts) {
      part = part.trim();
      if (part.startsWith(name)) {
        return part.substring(name.length, part.length);
      }
    }
    return null;
  };

  const accessToken = getCookieValue(headerCookies, "accessToken");

  if (!headerCookies) {
    return res.status(401).send("헤더에 cookie가 없습니다.");
  }

  if (accessToken) {
    jwt.verify(accessToken, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).send("유효하지 않은 토큰입니다.");
      } else {
        req.user = decoded; // 디코딩된 페이로드를 req.user에 저장
        next();
      }
    });
  } else {
    res.status(401).send("로그인이 필요합니다.");
  }
};

exports.isNotLoggedIn = (req, res, next) => {
  const authHeader = req.headers["Authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    next();
  } else {
    res.status(401).send("이미 로그인한 사용자는 접근할 수 없습니다.");
  }
};
