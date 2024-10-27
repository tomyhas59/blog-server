import express, { Request, Response, NextFunction } from "express";
import morgan from "morgan"; // 미들웨어
import cors from "cors";
import path from "path";
import cookieParser from "cookie-parser"; // 미들웨어
import db from "./models";
import dotenv from "dotenv";
import http from "http";
import fs from "fs";
import setupSocketIO from "./socket";
import postRouter from "./routes/post";
import userRouter from "./routes/user";

// .env 파일에서 환경 변수 로드
dotenv.config();

// Express 인스턴스 생성
const app = express();

// 미들웨어-------------------------------
// 프론트엔드와 백엔드 도메인 일치시키기 위한 CORS 설정
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? "https://tomyhasblog.vercel.app"
        : "http://localhost:3000",
    credentials: true, // 쿠키 전송 허용
  })
);

app.use(cookieParser());

// uploads 디렉토리가 없으면 생성
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// uploads를 위한 정적 파일 제공 설정
app.use("/", express.static(uploadDir));
app.use(
  morgan("dev"), // 요청 로그를 콘솔에 출력
  express.json(), // JSON 요청 본문 파싱 허용
  express.urlencoded({ extended: false }) // URL 인코딩 데이터 파싱 허용
);

// Sequelize 연결
db.sequelize
  .sync()
  .then(() => {
    console.log("DB 연결 성공");
  })
  .catch(console.error);

// 라우터 사용
app.use("/user", userRouter);
app.use("/post", postRouter);

// HTTP 서버 생성
const serverInstance = http.createServer(app);

// socket.io 설정
setupSocketIO(serverInstance);

// 서버 시작
const port = process.env.NODE_ENV === "production" ? 8000 : 3075;
serverInstance.listen(port, () => {
  console.log(`서버가 포트 ${port}에서 실행 중입니다.`);
});
