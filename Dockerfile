FROM node:18

# Cài đặt ffmpeg
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Cài đặt dependencies
COPY package*.json ./
RUN npm install

# Copy project files
COPY . .

# Thiết lập biến môi trường cho ffmpeg
ENV FFMPEG_PATH=/usr/bin/ffmpeg

CMD ["node", "index.js"]