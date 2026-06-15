## Docker Express API

Express API that serves `public/index.html` on port `3005`.

### Run with Docker

```bash
docker build -t express-docker-api .
docker run --rm -p 3005:3005 --name express-api express-docker-api
```

Open `http://localhost:3005`.

### Run locally

```bash
npm install
npm start
```
