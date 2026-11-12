FROM nginx:1.27-alpine
# Railway injects $PORT; the official image renders *.template files with envsubst at start.
COPY default.conf.template /etc/nginx/templates/default.conf.template
COPY index.html /usr/share/nginx/html/index.html
