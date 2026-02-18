# Nintendo Museum Ticket Checker

Automatically checks [Nintendo Museum](https://museum-tickets.nintendo.com/en/calendar) ticket availability and sends email notifications when tickets become available.

## Features

- Scrapes the Nintendo Museum booking calendar using Puppeteer (headless Chromium)
- Scrapes available **time slots** per date (e.g. `16:00 - 16:30`) without requiring login
- Sends styled HTML email notifications via Gmail SMTP, with time slot pills per date card
- Runs as a Kubernetes CronJob (every 10 minutes) or standalone via `node-cron`

## Quick Start

### Prerequisites

- Node.js 22+
- A Gmail account with [App Password](https://myaccount.google.com/apppasswords) enabled

### Setup

```bash
npm install
cp .env.example .env
```

Edit `.env` with your credentials:

```
GMAIL_USER=your-gmail@gmail.com
GMAIL_APP_PASSWORD=your-app-password
NOTIFY_EMAIL=recipient@example.com
```

### Run

```bash
# Single check (run once and exit)
npm run check

# Scheduled mode (runs every hour via node-cron)
npm start

# Test email rendering with mock data
npm run test-email

# Test full April scrape (calendar + time slots) and send real email
npm run test-april

# Debug time slot scraping for a single date (saves debug-*.png / .html)
DEBUG_SLOTS=1 npm run debug-slots
```

## Deploy to Minikube

```bash
# Start minikube
minikube start --driver=docker

# Create ConfigMap from .env
kubectl create configmap nintendo-ticket-checker-env --from-env-file=.env

# Build image inside minikube
eval $(minikube docker-env)
docker build -t nintendo-ticket-checker:latest .

# Deploy
kubectl apply -f k8s/cronjob.yaml

# Verify
kubectl get cronjob
```

See [docs/deployment.md](docs/deployment.md) for the full deployment guide.

## Architecture

See [docs/architecture.md](docs/architecture.md) for details on the project structure and design decisions.

## License

MIT
