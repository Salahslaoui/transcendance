#!/bin/sh

KEY=/etc/ssl/private/sslkey.key
CRT=/etc/ssl/certs/sslcert.crt
CONF=/etc/nginx/nginx.conf
DOMAIN=${DOMAIN_NAME:-localhost}

if [ ! -f "$KEY" ] || [ ! -f "$CRT" ]; then
    echo "Generating private key and certificate for nginx"
    openssl genrsa -out /etc/ssl/private/sslkey.key 2048
    openssl req -new -x509 -key "$KEY" -out "$CRT"  -days 365 -subj "/CN=$DOMAIN_NAME"
fi



echo "Setting up domain name in config file..."
envsubst '$DOMAIN_NAME' < /etc/nginx/nginx.conf.temp > "$CONF"
rm -f /etc/nginx/nginx.conf.temp
