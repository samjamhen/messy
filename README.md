# Messy

Messy is a React Native application built with Expo SDK 57, React Native, and TypeScript. Development runs in a Docker Dev Container so macOS and Windows contributors share the same Node, npm, Expo, Java, and Android SDK environment.

## Repository layout

```text
messy/
├── .devcontainer/devcontainer.json  # VS Code Dev Container configuration
├── .dockerignore
├── Dockerfile                       # Node 24 development/build image
├── Jenkinsfile                      # CI pipeline
└── messy-app/
    ├── app.json
    ├── package.json
    ├── package-lock.json
    ├── tsconfig.json
    └── src/
```

The application lives in `messy-app`. Run npm and Expo commands from that directory unless a command below says otherwise.

## Prerequisites

Install:

- [Git](https://git-scm.com/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Visual Studio Code](https://code.visualstudio.com/)
- The VS Code Dev Containers extension (`ms-vscode-remote.remote-containers`)

macOS developers also need Xcode to build or run the iOS app. Windows developers should install Android Studio and run the Android emulator on Windows; Xcode and the iOS Simulator are not available on Windows.

## Development setup

Clone and open the repository:

```bash
git clone https://github.com/samjamhen/messy.git
cd messy
code .
```

Make sure Docker Desktop is running. In VS Code, run **Dev Containers: Reopen in Container** from the Command Palette. The first build can take several minutes because the image installs Node 24, Java, npm dependencies, and Android SDK tools.

The Dev Container:

- uses the `node` user;
- installs dependencies with `npm ci`;
- keeps Linux `node_modules` in a Docker volume; and
- forwards Expo Metro on port `8081`.

Do not copy macOS or Windows `node_modules` into the container.

## Running Expo

Inside the Dev Container:

```bash
cd messy-app
npm start
```

Useful commands:

```bash
npm run android        # Native Android development build
npm run ios            # Native iOS development build (macOS only)
npm run web            # Web development server
npm run lint           # Expo lint
npx tsc --noEmit       # Type-check without emitting files
npx expo start --clear # Start Metro with a cleared cache
```

Metro runs inside Docker and is forwarded to the host at `http://localhost:8081`. Check connectivity from a host terminal with:

```bash
curl http://localhost:8081
```

Docker cannot run Apple's iOS Simulator. On macOS, Xcode and the simulator run on the host while Metro runs in the Dev Container. The Android emulator should likewise run on the host. Normal JavaScript and TypeScript edits use Fast Refresh; rebuild the native app only after changing native dependencies or native configuration.

## Dependencies and rebuilds

Use the committed lockfile for reproducible installs:

```bash
cd messy-app
npm ci
```

Rebuild the Dev Container after changing `Dockerfile`, `.devcontainer/devcontainer.json`, or system packages. Re-run `npm ci` after dependency or lockfile changes.

TypeScript imports CSS on web. The declaration in `messy-app/src/types/styles.d.ts` allows both CSS modules and global CSS imports to pass strict type-checking.

## Environments

Expo exposes client-side configuration through variables prefixed with `EXPO_PUBLIC_`. For local development, create `messy-app/.env.local`:

```dotenv
EXPO_PUBLIC_ENVIRONMENT=development
EXPO_PUBLIC_API_URL=http://localhost:3000
```

Use it in application code as:

```ts
const apiUrl = process.env.EXPO_PUBLIC_API_URL;
```

`EXPO_PUBLIC_` values are embedded in the application bundle. Never store passwords, private keys, signing credentials, or server-side secrets in them. Local `.env*.local` files are ignored by Git.

When EAS Build is introduced, use `development`, `preview`, and `production` profiles in `messy-app/eas.json`, with the corresponding EAS environment assigned explicitly to each profile. Use different iOS bundle identifiers and Android application IDs if development and production builds must be installed on one device simultaneously.

## Jenkins CI

The root `Jenkinsfile` defines the current pipeline:

1. Check Git and Docker availability.
2. Run `npm ci` and `npx tsc --noEmit` inside `node:24-bookworm`.
3. Build the repository Docker image as `messy-app:<Jenkins build number>`.
4. Clean the Jenkins workspace after the run.

Jenkins itself runs on the macOS host, while Node commands run in Docker. The Jenkins environment includes `/usr/local/bin` and `/opt/homebrew/bin` so the Homebrew service can find Docker.

### Local Jenkins requirements

- Jenkins LTS running at `http://localhost:8080`
- Java 21
- Docker Desktop running
- Jenkins plugins: Pipeline, Git, GitHub, GitHub Branch Source, and Workspace Cleanup

The Jenkins job should be a **Multibranch Pipeline** with GitHub as its branch source and `Jenkinsfile` as its script path.

### Pull requests and GitHub status checks

A pull request will receive a Jenkins build only when all of the following are configured:

1. The Multibranch Pipeline's GitHub source has pull-request discovery enabled under **Behaviors**.
2. Jenkins scans the repository after the PR is opened, either through a GitHub webhook or a periodic branch-indexing trigger.
3. Jenkins has authenticated GitHub credentials with permission to read the repository and write commit statuses/checks.

Anonymous GitHub access can clone this public repository, but it has a small API quota and cannot publish a Jenkins result back to the PR. Add a GitHub App or fine-grained token to Jenkins, select it in the Multibranch Pipeline's GitHub branch source, and grant it repository metadata/content read access plus commit-status or checks write access.

For instant builds, GitHub must be able to reach Jenkins at a public HTTPS URL. Configure the repository webhook as:

```text
https://<jenkins-domain>/github-webhook/
```

A Jenkins instance available only at `localhost` cannot receive GitHub webhooks. For local use, enable **Scan Multibranch Pipeline Triggers → Periodically if not otherwise run**, or manually select **Scan Multibranch Pipeline Now**.

Once Jenkins has published a successful status, add that status as a required check in the GitHub ruleset for `main`.

## SonarQube (optional)

SonarQube is not currently part of the committed pipeline. To run a local evaluation server with persistent Docker volumes:

```bash
docker volume create sonarqube_data
docker volume create sonarqube_logs
docker volume create sonarqube_extensions

docker run -d \
  --name sonarqube \
  --restart unless-stopped \
  -e SONAR_ES_BOOTSTRAP_CHECKS_DISABLE=true \
  -p 9000:9000 \
  -v sonarqube_data:/opt/sonarqube/data \
  -v sonarqube_logs:/opt/sonarqube/logs \
  -v sonarqube_extensions:/opt/sonarqube/extensions \
  sonarqube:latest
```

Open `http://localhost:9000` and initially sign in with `admin` / `admin`. Create a `messy` project and token, store the token in Jenkins as a **Secret text** credential, and configure **Manage Jenkins → System → SonarQube servers** with `http://localhost:9000`.

Install the Jenkins **SonarQube Scanner** plugin and configure an automatically installed scanner named `SonarScanner` under **Manage Jenkins → Tools**. Before adding a scan stage, commit a root `sonar-project.properties` file defining `messy-app` as the source directory and excluding generated directories such as `node_modules`, `.expo`, `coverage`, `ios`, and `android`.

SonarQube Community Build should analyze only `main`; full pull-request and branch analysis requires a commercial SonarQube edition or SonarQube Cloud. Test coverage will remain unavailable until the project has a test runner that produces `messy-app/coverage/lcov.info`.

## Troubleshooting

### Jenkins cannot find Docker

Confirm the `PATH` block remains in `Jenkinsfile` and Docker Desktop is running:

```bash
/usr/local/bin/docker --version
```

### GitHub indexing pauses for several minutes

The branch source is using anonymous GitHub API access. Add authenticated GitHub credentials to the Multibranch Pipeline.

### TypeScript cannot resolve CSS

Confirm `messy-app/src/types/styles.d.ts` is present and included by `tsconfig.json`.

### Metro cannot be reached

Run `npm start` inside `messy-app`, then verify port `8081` from the host. If it fails, check the Dev Container port forwarding configuration.

### Platform-specific native-module errors

Errors mentioning files such as `*.linux-arm64-gnu.node` usually mean `node_modules` came from the wrong operating system. Remove that installation and reinstall inside the Dev Container volume with `npm ci`.

### Large or slow Docker builds

Confirm `.dockerignore` excludes `messy-app/node_modules`, `messy-app/.expo`, generated native folders, `.git`, and `.DS_Store`.
