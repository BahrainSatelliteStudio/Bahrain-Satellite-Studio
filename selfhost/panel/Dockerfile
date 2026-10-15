FROM node:22-alpine
WORKDIR /app
COPY server.js app.js package.json ./
COPY public ./public
ENV PORT=8090 PANEL_DATA=/data
VOLUME /data
EXPOSE 8090
HEALTHCHECK CMD wget -qO- http://127.0.0.1:8090/health || exit 1
CMD ["node", "server.js"]
