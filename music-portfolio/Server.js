import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 静的ファイル公開
app.use(express.static(path.join(__dirname, "public")));
app.use("/musics", express.static(path.join(__dirname, "musics")));

// 音楽一覧 API
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

app.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
});
