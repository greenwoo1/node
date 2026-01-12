FROM nginx:alpine

# Копіюємо конфігурацію Nginx
COPY ./nginx/nginx.conf /etc/nginx/nginx.conf

# Очищаємо дефолтну папку Nginx
RUN rm -rf /usr/share/nginx/html/*

# Копіюємо ВСІ файли фронтенду (index.html, js, css, assets)
COPY ./frontend/src /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
