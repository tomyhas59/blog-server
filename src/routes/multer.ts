import multer, { StorageEngine } from "multer";
import path from "path";
import { Request } from "express";

// Multer 저장소 설정
const storage: StorageEngine = multer.diskStorage({
  destination(
    req: Request,
    file: Express.Multer.File,
    callback: (error: Error | null, destination: string) => void
  ) {
    callback(null, "uploads"); // 성공 시 저장 폴더
  },
  filename(
    req: Request,
    file: Express.Multer.File,
    callback: (error: Error | null, filename: string) => void
  ) {
    const ext = path.extname(file.originalname); // 확장자
    const basename = path.basename(file.originalname, ext); // 확장자를 제외한 파일명
    callback(null, `${basename}_${new Date().getTime()}${ext}`); // 덮어씌우는 것 방지
  },
});

// Multer 업로드 설정
const upload = multer({
  storage,
  limits: { fileSize: 28 * 1024 * 1024 }, // 28MB
});

export default upload;
