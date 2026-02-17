# Deployment Guide

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Docker Desktop | v29+ | https://www.docker.com/products/docker-desktop |
| Minikube | v1.34+ | https://minikube.sigs.k8s.io/docs/start |
| kubectl | v1.28+ | Bundled with Docker Desktop / Minikube |

## Local Development (without Docker)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```
GMAIL_USER=your-gmail@gmail.com
GMAIL_APP_PASSWORD=your-app-password
NOTIFY_EMAIL=recipient@example.com,another@example.com
```

> To create a Gmail App Password: Google Account > Security > 2-Step Verification > App passwords

### 3. Run

```bash
# Single check (run once and exit)
npm run check

# Scheduled mode (runs every hour via node-cron)
npm start
```

### 4. Test email notification

There is a dedicated script `src/test-email.ts` that sends a mock notification (simulating 2 available dates) without actually scraping the website:

```bash
npx ts-node src/test-email.ts
```

This uses the `GMAIL_USER`, `GMAIL_APP_PASSWORD`, and `NOTIFY_EMAIL` from your `.env`. Use it to verify:
- Gmail App Password is valid
- All recipients in `NOTIFY_EMAIL` receive the email
- Email content renders correctly

---

## Deploy to Minikube

### Step 1: Start Docker Desktop

Launch Docker Desktop from the Start Menu and wait until the icon shows "Running".

### Step 2: Start Minikube

```bash
minikube start --driver=docker
```

### Step 3: Create ConfigMap from `.env`

```bash
kubectl create configmap nintendo-ticket-checker-env --from-env-file=.env
```

### Step 4: Build the Docker Image

Build the image directly in Minikube's Docker daemon (no registry needed):

```bash
minikube image build -t nintendo-ticket-checker:latest .
```

### Step 5: Deploy to Kubernetes

```bash
kubectl apply -f k8s/
```

This creates:
- A `CronJob` that runs every 10 minutes

### Step 6: Verify

```bash
# Check CronJob is created
kubectl get cronjob

# Trigger a manual test run
kubectl create job --from=cronjob/nintendo-ticket-checker test-run

# Watch the job
kubectl get jobs -w

# View logs
kubectl logs job/test-run

# Clean up the test job
kubectl delete job test-run
```

---

## Common Operations

### View CronJob status

```bash
kubectl get cronjob nintendo-ticket-checker
```

### View recent job history

```bash
kubectl get jobs
```

### View logs of the latest job

```bash
# List pods from jobs
kubectl get pods --sort-by=.metadata.creationTimestamp

# View logs of a specific pod
kubectl logs <pod-name>
```

### Trigger a manual run

```bash
kubectl create job --from=cronjob/nintendo-ticket-checker manual-$(date +%s)
```

### Update the image after code changes

```bash
minikube image build -t nintendo-ticket-checker:latest .

# Existing CronJob will use the new image on next run (imagePullPolicy: Never)
```

### Update environment variables

Edit `.env`, then recreate the ConfigMap:

```bash
kubectl create configmap nintendo-ticket-checker-env --from-env-file=.env --dry-run=client -o yaml | kubectl apply -f -
```

### Pause / Resume the CronJob

```bash
# Pause (stop scheduling new jobs)
kubectl patch cronjob nintendo-ticket-checker -p '{"spec":{"suspend":true}}'

# Resume
kubectl patch cronjob nintendo-ticket-checker -p '{"spec":{"suspend":false}}'
```

### Delete everything

```bash
kubectl delete -f k8s/
```

### Stop Minikube

```bash
minikube stop
```

---

## CronJob Configuration

| Setting | Value | Description |
|---------|-------|-------------|
| `schedule` | `*/10 * * * *` | Every 10 minutes |
| `concurrencyPolicy` | `Forbid` | Skip if previous job is still running |
| `backoffLimit` | `2` | Retry failed jobs up to 2 times |
| `restartPolicy` | `OnFailure` | Restart container on failure |
| `successfulJobsHistoryLimit` | `3` | Keep last 3 successful job records |
| `failedJobsHistoryLimit` | `3` | Keep last 3 failed job records |
| Memory limit | `512Mi` | Maximum memory per container |
| CPU limit | `500m` | Maximum 0.5 CPU cores per container |
| `imagePullPolicy` | `Never` | Use locally built image (no registry) |

## Troubleshooting

### Job pod stuck in `CrashLoopBackOff`

```bash
kubectl describe pod <pod-name>
kubectl logs <pod-name>
```

Common causes:
- Missing or invalid ConfigMap — check `kubectl get configmap nintendo-ticket-checker-env -o yaml`
- Chromium crash — may need more memory, increase limits in `k8s/cronjob.yaml`

### Image not found

Make sure you built the image inside Minikube's Docker daemon:

```bash
# Correct: builds inside Minikube
minikube image build -t nintendo-ticket-checker:latest .

# Verify image exists
minikube image list | grep nintendo
```

### Minikube won't start

```bash
# Check Docker Desktop is running
docker info

# If corrupted, delete and recreate
minikube delete
minikube start --driver=docker
```
