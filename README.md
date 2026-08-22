# Messy App — Development Setup

Messy is a React Native application built with Expo.

The development environment runs inside a Docker Dev Container so that
developers on macOS and Windows use the same Node, npm, Expo, and Android
development environment.

## Architecture

The development setup is:

Developer's computer
│
├── VS Code
├── Docker Desktop
├── Native simulator/emulator
│
└── Docker Dev Container
    ├── Node.js
    ├── npm
    ├── Expo
    ├── Metro Bundler
    ├── Android SDK
    └── Linux node_modules

Metro runs inside Docker on port `8081`.

Port `8081` is forwarded to the host machine through the Dev Container
configuration.

---

# 1. Prerequisites

## All Developers

Install:

### Git

https://git-scm.com/

Verify:

    git --version

### Docker Desktop

https://www.docker.com/products/docker-desktop/

Make sure Docker Desktop is running before opening the project in a
Dev Container.

### Visual Studio Code

https://code.visualstudio.com/

### VS Code Dev Containers Extension

Install the Microsoft extension:

    Dev Containers

Extension ID:

    ms-vscode-remote.remote-containers

---

# 2. Clone the Repository

Clone the repository:

    git clone <repository-url>

Move into the project:

    cd messy

Open it in VS Code:

    code .

The repository should look approximately like:

    messy/
    ├── .devcontainer/
    │   └── devcontainer.json
    ├── .dockerignore
    ├── Dockerfile
    └── messy-app/
        ├── package.json
        ├── package-lock.json
        ├── src/
        └── ...

---

# 3. Start the Development Container

Make sure Docker Desktop is running.

In VS Code:

1. Press `Cmd + Shift + P` on macOS or `Ctrl + Shift + P` on Windows.
2. Search for:

       Dev Containers: Reopen in Container

3. Select it.
4. Wait for Docker to build the development environment.

The first build can take several minutes because the container installs
Node dependencies, Java, and the Android SDK.

After the container opens, the VS Code terminal should be running inside
Linux.

Verify:

    node --version

The project currently uses Node 20.

---

# 4. Install Dependencies

Dependencies should normally be installed automatically when the Dev
Container is created.

If necessary, run:

    cd messy-app
    npm install

IMPORTANT:

`node_modules` inside the Dev Container must contain Linux dependencies.

Do not copy host macOS or Windows `node_modules` into the container.

The Dev Container uses a Docker volume for `node_modules` to prevent
platform-specific native packages from conflicting.

---

# 5. Start Expo

Inside the Dev Container:

    cd messy-app
    npx expo start

Expo will start Metro Bundler.

Metro runs inside Docker on:

    8081

The Dev Container forwards this port to the host computer.

To verify Metro is reachable, open a terminal OUTSIDE the Dev Container
and run:

    curl http://localhost:8081

A response means the host computer can reach Metro inside Docker.

---

# macOS Setup

macOS developers can run both iOS and Android applications locally.

## 6A. Install Xcode

Install Xcode from the Mac App Store.

After installation, run:

    sudo xcodebuild -runFirstLaunch

Verify Xcode:

    xcodebuild -version

Verify that Apple's simulator tools are available:

    xcrun simctl list devices

You should see available iPhone simulators.

---

## 7A. iOS Development Build

IMPORTANT:

Docker cannot run the iOS Simulator.

The iOS Simulator and Xcode run directly on macOS, while Expo/Metro runs
inside Docker.

The architecture is:

    iOS Simulator
          │
          │ localhost:8081
          ▼
    macOS
          │
          │ forwarded port
          ▼
    Docker Dev Container
          │
          ▼
    Metro Bundler

The native iOS development build must be created using Xcode/macOS.

Once a development build is installed in the simulator, it connects to
Metro running through the forwarded port.

For native iOS changes, the development build may need to be rebuilt.

For normal JavaScript/TypeScript changes, rebuilding the native app is
not required. Metro will update the running application.

---

## 8A. Start iOS Development

1. Start Docker Desktop.
2. Open the repository in VS Code.
3. Reopen the project in the Dev Container.
4. Inside the container run:

       cd messy-app
       npx expo start

5. Start the iOS Simulator on macOS.
6. Open the Messy development build.
7. Connect the development build to Metro.

Normal React Native code changes should now appear through Metro/Fast
Refresh.

---

# Windows Setup

Windows developers cannot run the iOS Simulator locally because Xcode
and Apple's iOS Simulator require macOS.

Windows developers should use Android for local development.

## 6B. Enable Virtualization

Hardware virtualization must be enabled for the Android Emulator.

On Windows, ensure virtualization is enabled in the BIOS/UEFI.

You can check:

    Task Manager
    → Performance
    → CPU
    → Virtualization: Enabled

---

## 7B. Install Android Studio

Download Android Studio:

https://developer.android.com/studio

Install:

- Android Studio
- Android Emulator
- Android SDK
- Android SDK Platform Tools

NOTE:

The Docker development environment already contains Android SDK tools,
but the graphical Android Emulator should normally run directly on
Windows rather than inside Docker.

---

## 8B. Create an Android Virtual Device

Open Android Studio.

Go to:

    Device Manager
    → Create Device

Choose a device, for example:

    Pixel 9

Install an appropriate Android system image and create the emulator.

Start the emulator from Android Studio.

---

## 9B. Start Android Development

1. Start Docker Desktop.
2. Start the Android Emulator.
3. Open the repository in VS Code.
4. Reopen the repository in the Dev Container.
5. Inside the container run:

       cd messy-app
       npx expo start

Metro will run inside Docker on port `8081`.

The Android development build/emulator must be able to reach Metro
through the host machine.

---

# iOS Development on Windows

Windows cannot:

- Install Xcode
- Run the iOS Simulator
- Compile an iOS application locally with Xcode

Windows developers can still work on the React Native codebase.

Options for testing iOS include:

1. Using a physical iPhone with an appropriate development build.
2. Using Expo EAS Build to create iOS builds remotely.
3. Using a Mac for native iOS development/testing.

---

# Docker Configuration

The Dev Container configuration is located at:

    .devcontainer/devcontainer.json

It is responsible for:

- Building the Docker development environment
- Mounting the source code
- Forwarding Metro port `8081`
- Creating Linux-specific `node_modules`

Example:

    {
      "name": "Messy",
      "build": {
        "context": "..",
        "dockerfile": "../Dockerfile"
      },
      "forwardPorts": [8081],
      "mounts": [
        "source=messy-node-modules,target=/workspaces/messy/messy-app/node_modules,type=volume"
      ],
      "postCreateCommand": "cd /workspaces/messy/messy-app && npm install"
    }

---

# Dockerignore

`.dockerignore` prevents unnecessary files from being copied into the
Docker build context.

It should contain:

    messy-app/node_modules
    messy-app/.expo
    messy-app/ios
    messy-app/android
    .git
    .DS_Store

This is important because `node_modules` can be several gigabytes and
dramatically slow down Docker builds.

---

# Common Commands

Start Expo:

    cd messy-app
    npx expo start

Clear the Metro cache:

    npx expo start --clear

Check Node:

    node --version

Check npm:

    npm --version

Check Android Debug Bridge:

    adb --version

Check Metro from the host:

    curl http://localhost:8081

Stop Expo:

    Ctrl + C

---

# When Do I Need to Rebuild?

## You DO NOT need to rebuild the Docker container when:

- Editing React components
- Editing TypeScript/JavaScript
- Changing styles
- Adding screens
- Changing application logic

Metro handles these changes.

## Rebuild the Dev Container when:

- The Dockerfile changes
- `.devcontainer/devcontainer.json` changes
- System-level Linux dependencies change

Use:

    Dev Containers: Rebuild and Reopen in Container

## Reinstall npm dependencies when:

`package.json` or `package-lock.json` changes.

Run:

    npm install

## Rebuild the native iOS/Android app when:

- Adding/changing native dependencies
- Changing native configuration
- Changing native iOS/Android code

Normal React Native JavaScript/TypeScript changes do not require a
native rebuild.

---

# Troubleshooting

## Metro cannot be reached

Check that Expo is running:

    npx expo start

Then, from the HOST computer:

    curl http://localhost:8081

If this fails, check that port `8081` is forwarded by the Dev Container.

## Native Node module errors

Errors mentioning files such as:

    *.linux-arm64-gnu.node

usually indicate a platform-specific `node_modules` problem.

Make sure dependencies are installed inside the Docker container and
that the Docker `node_modules` volume is being used.

## Docker build is extremely large

Check that the file is named exactly:

    .dockerignore

not:

    .dockerignoore

and make sure `messy-app/node_modules` is ignored.

## iOS Simulator is unavailable on Windows

This is expected. Apple's iOS Simulator requires macOS and Xcode.
Use Android locally or use a remote iOS build/testing workflow.