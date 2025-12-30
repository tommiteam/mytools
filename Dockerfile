# ---------- Build Stage ----------
FROM node:20-alpine AS builder
WORKDIR /app

# Accept build-time args (passed from CI)
ARG VITE_API_BASE_URL
ARG VITE_API_DIF_URL

# Make them available during `npm run build`
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_API_DIF_URL=$VITE_API_DIF_URL

# Install deps (use npm ci for lockfile reproducibility)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .

# (Optional) Fail fast if missing
RUN test -n "$VITE_API_BASE_URL" || (echo "Missing VITE_API_BASE_URL" && exit 1)
RUN test -n "$VITE_API_DIF_URL" || (echo "Missing VITE_API_DIF_URL" && exit 1)

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
