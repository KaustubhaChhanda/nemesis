FROM python:3.11-slim

WORKDIR /app

# System deps for Playwright Chromium + existing build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev \
    # Chromium runtime dependencies
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libdbus-1-3 libxkbcommon0 libxcomposite1 \
    libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2 \
    libpango-1.0-0 libcairo2 libatspi2.0-0 libx11-6 libx11-xcb1 \
    libxcb1 libxext6 libxcb-dri3-0 libxshmfence1 libglu1-mesa \
    fonts-liberation wget ca-certificates && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright's Chromium browser binary
RUN playwright install chromium --with-deps 2>/dev/null || playwright install chromium

RUN python -c "import nltk; nltk.download('punkt_tab', quiet=True); nltk.download('averaged_perceptron_tagger', quiet=True); nltk.download('stopwords', quiet=True)"

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
