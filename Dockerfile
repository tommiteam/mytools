# ---------- Build Stage ----------
FROM node:20-alpine AS builder
WORKDIR /app

# Install deps (use npm ci for lockfile reproducibility)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ---------- Runtime Stage ----------
FROM nginx:1.27-alpine
WORKDIR /usr/share/nginx/html

# Remove default static assets
RUN rm -rf ./*

# Copy Vite build output (dist)
COPY --from=builder /app/dist ./

# Copy custom Nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
