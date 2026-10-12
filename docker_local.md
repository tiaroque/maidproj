**Cursor**

Build both images from the repo root, put them on one network, and start the backend first.

```bash
docker network create maid

docker build -t maid-api ./wish-backend-ts
docker build -t maid-web ./maid
```

The backend reads `wish-backend-ts/.env`. Inside the container, `127.0.0.1` is the container itself, so point Mongo at the host. On this Mac that address is `host.docker.internal`. Use `COOKIE_SECURE=false` while you are on `http://localhost`.

```bash
docker run --name maid-api --network maid -p 3011:3011 \
  --env-file ./wish-backend-ts/.env \
  -e MONGO_URL=mongodb://host.docker.internal:27017/ \
  -e COOKIE_SECURE=false \
  -e CORS_ORIGINS=http://localhost:4000 \
  -e returnUrlEmail=http://localhost:4000 \
  -e GOOGLE_REDIRECT_URI=http://localhost:4000/api/users/google/callback \
  maid-api
```

The frontend forwards `/api` to `API_PROXY_TARGET`. That must be the backend container name, not `localhost`.

```bash
docker run --name maid-web --network maid -p 4000:4000 \
  -e API_PROXY_TARGET=http://maid-api:3011 \
  -e NG_ALLOWED_HOSTS=localhost,127.0.0.1 \
  maid-web
```

Open `http://localhost:4000`. The API is on port `3011`.

If those names already exist, remove them with `docker rm -f maid-api maid-web`. Stop the local `npm start` and `npm run debug` processes if they are still using ports `4000` or `3011`.

