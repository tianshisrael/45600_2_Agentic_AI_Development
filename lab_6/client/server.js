import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const publicDir = path.join(__dirname, 'dist');

app.use(express.static(publicDir));

app.listen(PORT, () => {
  console.log(`Static server listening on http://localhost:${PORT}`);
});
