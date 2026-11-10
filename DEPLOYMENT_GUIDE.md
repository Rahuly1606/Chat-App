# Deployment

## Environment

Copy `.env.example` to a local ignored environment file and provide the required values. Never commit database URLs, JWT secrets, or Cloudinary credentials.

The Neon CLI writes `DATABASE_URL` and `DATABASE_URL_UNPOOLED` to `.env.local`. Application traffic uses the pooled URL; migrations use the direct URL.

## Neon

```sh
neon deploy
npm run migrate
```

## Application

The Express/Socket.IO backend must run on a long-lived Node host. Set `FRONTEND_URL` to the deployed frontend origin. For a separately hosted frontend, set `VITE_API_URL` and optionally `VITE_SOCKET_URL` to the backend origin before building.

```sh
npm run build
npm start
```

Set `NODE_ENV=production`, `JWT_SECRET`, `FRONTEND_URL`, the Neon database variables, and Cloudinary variables on the backend host. The frontend host only needs the public `VITE_*` backend URLs.

Rotate any credential that has ever been committed and purge it from Git history before publishing the repository.
