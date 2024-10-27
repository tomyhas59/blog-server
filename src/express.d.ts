// express/index.d.ts
import * as express from "express";

interface User {
  id: number;
  email: string;
  nickname: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: User; // 사용자 정보 추가
      file?: Express.Multer.File; // Multer로 업로드된 파일 정보 추가
      files: Express.Multer.File[];
    }
  }
}
