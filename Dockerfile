FROM node:12-alpine
WORKDIR /usr/app
COPY package*.json ./
COPY tsconfig*.json ./
RUN arch
RUN node -v
RUN apk add --no-cache \
        libstdc++ \
    && apk add --no-cache --virtual .build-deps \
        binutils-gold \
        curl \
        g++ \
        gcc \
        gnupg \
        libgcc \
        linux-headers \
        make \
        python \
        libc6-compat 
RUN npm install
COPY . ./
RUN npm run build

EXPOSE 8001

CMD ["npm", "run", "start" ]