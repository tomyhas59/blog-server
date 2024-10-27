import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const isLoggedIn = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const tokenCookie = req.cookies.accessToken;

  if (!tokenCookie) {
    res.status(401).send("헤더에 쿠키가 없습니다.");
    return;
  }

  jwt.verify(
    tokenCookie,
    process.env.JWT_SECRET as string,
    (err: any, decoded: any) => {
      if (err) {
        return res.status(401).send("유효하지 않은 토큰입니다.");
      } else {
        req.user = decoded; // 디코딩된 페이로드를 req.user에 저장하여 다음 핸들러에서 사용할 수 있도록 합니다.
        console.log(decoded);
        next();
      }
    }
  );
};

export const isNotLoggedIn = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const tokenCookie = req.cookies.accessToken;

  if (!tokenCookie) {
    next();
  } else {
    res.status(401).send("이미 로그인한 사용자는 접근할 수 없습니다.");
  }
};
