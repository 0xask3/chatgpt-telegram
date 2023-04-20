# Builder stage
FROM node:lts-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN yarn install --frozen-lockfile --ignore-scripts 

COPY . .
RUN yarn build


# Runner stage
FROM node:lts-alpine

WORKDIR /app

COPY package.json ./
RUN yarn install --frozen-lockfile --ignore-scripts --prod --no-optional

# Install prebuilt lmdb binary
RUN arch_out=$(uname -m) \
 && if [ "${arch_out}" = "x86_64" ]; then \
        ARCH=x64; \
    elif [ "${arch_out}" = "aarch64" ]; then \
        ARCH=arm64; \
    elif echo "${arch_out}" | grep -q "armv"; then \
        ARCH=arm; \
    else \
        ARCH=${arch_out}; \
    fi \
 && LMDB_VER=$(yarn list lmdb | grep lmdb | awk '{print $2}') \
 && yarn add @lmdb/lmdb-linux-$ARCH@$LMDB_VER --ignore-scripts --prod --no-optional
# We can also build it ourselves:
# RUN apk add --no-cache python3 build-base
# RUN npm explore lmdb -- npm run install

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/config ./config
COPY --from=builder /app/.env ./.env

CMD yarn start
