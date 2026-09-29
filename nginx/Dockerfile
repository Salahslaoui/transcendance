FROM nginx:alpine

ARG DOMAIN_NAME

RUN apk add --no-cache openssl

COPY ./nginx.conf /etc/nginx/nginx.conf.temp

COPY ./setup_nginx.sh setup_nginx.sh

RUN chmod +x setup_nginx.sh && ./setup_nginx.sh

EXPOSE 443

CMD ["nginx", "-g", "daemon off;"]
