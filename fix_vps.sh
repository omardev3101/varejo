#!/bin/bash

# Change port to 3005 in /var/www/varejo/backend/.env
sed -i 's/PORT=3001/PORT=3005/g' /var/www/varejo/backend/.env

# Restart PM2 process
cd /var/www/varejo/backend && pm2 restart varejo

# Add nginx config
cat << 'EOF' > /tmp/varejo_nginx.conf
    location ^~ /varejo/ {
        alias /var/www/varejo/frontend/dist/;
        index index.html;
        try_files $uri $uri/ /varejo/index.html;
    }

    location ^~ /varejo/api/ {
        proxy_pass http://127.0.0.1:3005/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
EOF

# Insert after /farmabus/api/ block in pes-tecnologia
sed -i '/location \^~ \/farmabus\/api\/ {/,/    }/!b;//!d;/    }/r /tmp/varejo_nginx.conf' /etc/nginx/sites-available/pes-tecnologia

# Also add to default if it exists
if [ -f /etc/nginx/sites-available/default ]; then
    sed -i '/location \^~ \/farmabus\/api\/ {/,/    }/!b;//!d;/    }/r /tmp/varejo_nginx.conf' /etc/nginx/sites-available/default
fi

# Reload Nginx
nginx -t && systemctl reload nginx
