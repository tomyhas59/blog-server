const express = require("express");
const router = express.Router();
const { isLoggedIn, isNotLoggedIn } = require("./middlewares");
const PostService = require("../service/post");
const upload = require("./multer");

router.get("/all", PostService.readAll);
router.get("/search", PostService.search);
router.get("/searchNickname", PostService.searchNickname);
router.post(
  "/images",
  isLoggedIn,
  upload.array("image"),
  PostService.imageUpload
);
router.get("/", isLoggedIn, PostService.getUserPosts);
router.get("/comment", isLoggedIn, PostService.getUserComments);
router.post("/", isLoggedIn, upload.none(), PostService.create);
router.put("/:postId", isLoggedIn, upload.none(), PostService.update);
router.delete("/:postId", isLoggedIn, PostService.delete);
router.delete("/images/:filename", isLoggedIn, PostService.imageRemove);
router.delete("/:postId/images/:filename", isLoggedIn, PostService.imageDelete);
//------comment-------------------------------------
router.post("/:postId/comment", isLoggedIn, PostService.commentCreate);
router.put(
  "/:postId/comment/:commentId",
  isLoggedIn,
  PostService.commentUpdate
);
router.delete(
  "/:postId/comment/:commentId",
  isLoggedIn,
  PostService.commentDelete
);
//------reComment-------------------------------------
router.post(
  "/:postId/comment/:commentId/reComment",
  isLoggedIn,
  PostService.ReCommentCreate
);

router.put(
  "/:postId/comment/:commentId/reComment/:reCommentId",
  isLoggedIn,
  PostService.reCommentUpdate
);
router.delete(
  "/:postId/comment/:commentId/reComment/:reCommentId",
  isLoggedIn,
  PostService.reCommentDelete
);
//----------like---------------------------------
router.patch("/:postId/like", isLoggedIn, PostService.postLike);
router.delete("/:postId/like", isLoggedIn, PostService.postUnLike);
module.exports = router;
//-----chat------------------------------
router.post("/chat", isLoggedIn, PostService.createChatMessage);
router.get("/allChat", isLoggedIn, PostService.readChatMessage);
router.delete("/chat/delete", isLoggedIn, PostService.deleteAllChatMessages);

//"https://Localhost:3000/post?idx=3000" => req.qurey.idx = 3000;

//"https://Localhost:3000/post/35" => req.params.postId = 35

//"https://Localhost:3000/post?page=1"

//"https://Localhost:3000/post?lastId=32&limit=10" => 32번부터 10개 요청

//"https://Localhost:3000/post?search=우자&sub=id
