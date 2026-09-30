#!/bin/bash

# Change port to 3010 in /var/www/varejo/backend/.env
sed -i 's/PORT=3005/PORT=3010/g' /var/www/varejo/backend/.env
sed -i 's/PORT=3001/PORT=3010/g' /var/www/varejo/backend/.env

# Restart PM2 process with --update-env
cd /var/www/varejo/backend && pm2 restart varejo --update-env

# Update nginx config port from 3005 to 3010 for varejo/api
sed -i 's/http:\/\/127.0.0.1:3005\/api\//http:\/\/127.0.0.1:3010\/api\//g' /etc/nginx/sites-available/pes-tecnologia
if [ -f /etc/nginx/sites-available/default ]; then
    sed -i 's/http:\/\/127.0.0.1:3005\/api\//http:\/\/127.0.0.1:3010\/api\//g' /etc/nginx/sites-available/default
fi

# Reload Nginx
nginx -t && systemctl reload nginx
