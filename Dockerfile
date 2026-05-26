# Azure DataStudio Stimulator — Enterprise
# Free self-hosted deployment using nginx-alpine (~25MB image).
# Build:  docker build -t ads-enterprise .
# Run:    docker run -p 8080:80 ads-enterprise
# Visit:  http://localhost:8080

FROM nginx:1.27-alpine

# Drop the default nginx page
RUN rm -rf /usr/share/nginx/html/*

# Copy the entire app
COPY . /usr/share/nginx/html/

# Replace nginx config with our hardened one
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
