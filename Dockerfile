
# syntax=docker.io/docker/dockerfile:1

# --- 1. BASE NODE ---
FROM node:18-bullseye AS base

# --- 2. INSTALL PYTHON, PIP, FFMPEG ---
RUN apt-get update && \
    apt-get install -y python3 python3-pip ffmpeg postgresql-client && \
    apt-get clean

# --- 3. SET WORKDIR ---
WORKDIR /app

# --- 4. COPIE DES DEPENDANCES NODE ---
RUN rm -rf node_modules .next

COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* .npmrc* ./
RUN if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci --legacy-peer-deps; \
    elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
    else echo "Lockfile not found." && exit 1; fi

# --- 4b. INSTALLER LES TYPES POUR PG ---
RUN npm install --save-dev @types/pg
RUN npm install --save-dev @types/fluent-ffmpeg
RUN npm install --save-dev @types/bcrypt

# --- 5. COPIE DES DEPENDANCES PYTHON ---
COPY requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt

# --- 6. COPIE DU CODE SOURCE ---
COPY . .

# --- 7. BUILDER NEXT.JS ---
RUN if [ -f yarn.lock ]; then yarn build; \
    elif [ -f package-lock.json ]; then npm run build; \
    elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm run build; \
    else echo "Lockfile not found." && exit 1; fi

# --- 8. EXPOSE PORT ET STARTUP ---
ENV PORT=32776
EXPOSE 32776

# S'assurer que l'app écoute surs 0.0.0.0 (et non localhost)
ENV HOST=0.0.0.0

CMD ["npm", "run", "dev"]