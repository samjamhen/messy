pipeline {
    agent any

    environment {
        PATH = "/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:${env.PATH}"
    }

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    stages {
        stage('Environment') {
            steps {
                sh '''
                    git --version
                    docker --version
                '''
            }
        }

        stage('Install and Type Check') {
            steps {
                sh '''
                    docker run --rm \
                      --user "$(id -u):$(id -g)" \
                      --env HOME=/tmp \
                      --volume "$WORKSPACE/messy-app:/app" \
                      --workdir /app \
                      node:24-bookworm \
                      sh -lc "npm ci && npx tsc --noEmit"
                '''
            }
        }

        stage('Build Docker Image') {
            steps {
                sh '''
                    docker build \
                      --tag "messy-app:${BUILD_NUMBER}" \
                      .
                '''
            }
        }
    }

    post {
        success {
            echo 'Messy passed all pipeline checks.'
        }

        failure {
            echo 'The pipeline failed. Check the failed stage logs.'
        }

        always {
            cleanWs()
        }
    }
}
