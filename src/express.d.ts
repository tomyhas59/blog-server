// express/index.d.ts
import * as express from "express";
import { User } from "../models/user"; // User 모델의 경로를 맞추세요.

declare global {
  namespace Express {
    interface Request {
      user?: User; // 사용자 정보 추가
      file?: Express.Multer.File; // Multer로 업로드된 파일 정보 추가
      files: Express.Multer.File[];
    }
  }
}
