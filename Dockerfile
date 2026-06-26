FROM mcr.microsoft.com/playwright:v1.59.1-jammy

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3-pip \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt

COPY . .

CMD ["sh", "-c", "uvicorn platform_app.app:app --host 0.0.0.0 --port ${PORT:-8000}"]
