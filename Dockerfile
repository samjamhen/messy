FROM node:24

RUN apt-get update && apt-get install -y \
    default-jdk \
    sudo \
    wget \
    unzip \
    curl \
    git \
    libgbm1 \
    libgtk-3-0 \
    libnss3 \
    libasound2 \
    libxss1 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libxkbcommon0 \
    libx11-xcb1 \
    && rm -rf /var/lib/apt/lists/*

# Allow node user to perform container setup tasks
RUN echo "node ALL=(root) NOPASSWD:ALL" > /etc/sudoers.d/node \
    && chmod 0440 /etc/sudoers.d/node

# Java - architecture independent
RUN JAVA_PATH="$(dirname "$(dirname "$(readlink -f "$(which java)")")")" && \
    ln -s "$JAVA_PATH" /opt/java

ENV JAVA_HOME=/opt/java
ENV PATH="${JAVA_HOME}/bin:${PATH}"

# Android SDK
ENV ANDROID_SDK_ROOT=/usr/local/android-sdk
ENV ANDROID_HOME=/usr/local/android-sdk
ENV PATH="${PATH}:${ANDROID_SDK_ROOT}/cmdline-tools/latest/bin:${ANDROID_SDK_ROOT}/platform-tools"

RUN mkdir -p "${ANDROID_SDK_ROOT}/cmdline-tools" && \
    wget -q -O /tmp/commandlinetools.zip \
    "https://dl.google.com/android/repository/commandlinetools-linux-8512546_latest.zip" && \
    unzip -q /tmp/commandlinetools.zip \
    -d "${ANDROID_SDK_ROOT}/cmdline-tools" && \
    mv "${ANDROID_SDK_ROOT}/cmdline-tools/cmdline-tools" \
       "${ANDROID_SDK_ROOT}/cmdline-tools/latest" && \
    rm /tmp/commandlinetools.zip

RUN yes | sdkmanager --licenses >/dev/null || true

RUN sdkmanager \
    "platform-tools" \
    "platforms;android-34" \
    "build-tools;34.0.0"

RUN chown -R node:node "${ANDROID_SDK_ROOT}"

WORKDIR /app

COPY --chown=node:node \
    messy-app/package.json \
    messy-app/package-lock.json \
    ./

RUN npm ci

COPY --chown=node:node messy-app/ .

USER node

EXPOSE 8081

CMD ["npx", "expo", "start", "--dev-client", "--host", "lan"]