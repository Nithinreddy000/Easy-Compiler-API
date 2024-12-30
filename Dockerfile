FROM node:17

WORKDIR /usr/src/app

ENV DEBIAN_FRONTEND=noninteractive

# Install required packages
RUN apt-get update && \
    apt-get install -y \
    gcc \
    mono-mcs \
    python3 \
    wget \
    default-jdk \
    && rm -rf /var/lib/apt/lists/*

# Set JAVA_HOME environment variable correctly
ENV JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64
ENV PATH=$PATH:$JAVA_HOME/bin

# Create and set permissions for temp directory
RUN mkdir -p temp && chmod 777 temp

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

EXPOSE 8080
CMD ["npm", "run", "start"]
