FROM e2bdev/code-interpreter:latest

USER root

# Install dependencies for Postgres, Redis, and Node
RUN apt-get update && apt-get install -y \
    postgresql \
    postgresql-contrib \
    redis-server \
    sudo \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

WORKDIR /app

# Install tsx globally for running TypeScript files (azure-proxy.ts)
RUN npm install -g tsx

# Setup Python environment
COPY crewai-service/requirements.txt /app/crewai-service/
RUN pip install -r /app/crewai-service/requirements.txt

# Setup Node environment
COPY package.json package-lock.json* /app/
RUN npm install

# Copy entire project
COPY . /app/

# Build Next.js frontend
RUN npm run build

# Make startup script executable
RUN chmod +x /app/start.sh
