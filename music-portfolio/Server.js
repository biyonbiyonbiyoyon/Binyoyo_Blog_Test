import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --------------------
// 静的ファイル公開
// --------------------
app.use(express.static(path.join(__dirname, "public"))); // HTML, CSS, JS
app.use("/musics", express.static(path.join(__dirname, "musics"))); // 音楽ファイル
app.use("/images", express.static(path.join(__dirname, "images"))); // ← 修正: project直下 images

// --------------------
// 音楽一覧 API
// --------------------
app.get("/api/musics", (req, res) => {
  const musicDir = path.join(__dirname, "musics");

  try {
    const files = fs
      .readdirSync(musicDir)
      .filter(file => /\.(mp3|wav|ogg)$/i.test(file));

    res.json(files);
  } catch (err) {
    res.status(500).json([]);
  }
});

// --------------------
// 画像一覧 API
// --------------------
app.get("/api/images", (req, res) => {
  const imagesDir = path.join(__dirname, "images"); // ← 修正: project直下 images

  try {
    const files = fs
      .readdirSync(imagesDir)
      .filter(file => /\.(png|jpg|jpeg|gif)$/i.test(file));

    const urls = files.map(file => `/images/${file}`);
    res.json(urls);
  } catch (err) {
    res.status(500).json([]);
  }
});

// --------------------
// サーバー起動
// --------------------
app.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
});
