import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const port = process.env.PORT || 3005;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


app.use((req,res,next)=>{
  console.log("--------------------------------");
  console.log(`${req.method} ${req.url}`);
  console.log("--------------------------------");
  next();
})

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "docker-express-api" });
});

app.listen(port, () => {
  console.log(`Express API is running on port ${port}`);
}); // nodejs event loop is running not stopping the process

