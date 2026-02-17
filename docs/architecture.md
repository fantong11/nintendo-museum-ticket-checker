# Architecture

## Overview

Nintendo Museum Ticket Checker is a Node.js application that periodically checks ticket availability on the [Nintendo Museum booking site](https://museum-tickets.nintendo.com/en/calendar) and sends email notifications when tickets become available.

It supports two execution modes:
- **Scheduled mode** (`npm start`) — runs as a long-lived process with `node-cron`
- **Single-run mode** (`npm run check` / `--once` flag) — runs once and exits, designed for Kubernetes CronJob

## Project Structure

```
nintendo-museum-ticket-checker/
├── src/
│   ├── index.ts                         # Entry point (mode selection, DI wiring)
│   ├── interfaces/
│   │   ├── ITicketChecker.ts            # check() → TicketStatus[]
│   │   ├── INotifier.ts                 # notify(availableTickets) → void
│   │   └── IScheduler.ts               # start(job) / stop()
│   ├── models/
│   │   └── TicketStatus.ts              # { date, day, available }
│   ├── utils/
│   │   └── parseDates.ts                # Parse TARGET_DATES env var format
│   └── services/
│       ├── PuppeteerTicketChecker.ts     # Headless Chromium scraping
│       ├── EmailNotifier.ts             # Gmail SMTP notifications
│       └── CronScheduler.ts             # node-cron wrapper
├── k8s/
│   └── cronjob.yaml                     # Kubernetes CronJob manifest
├── Dockerfile                           # Multi-stage build
├── .dockerignore
├── package.json
└── tsconfig.json
```

## Component Diagram

```
┌─────────────┐
│  index.ts   │  Entry point: parses --once flag, wires dependencies
└──────┬──────┘
       │
       ├──────────────────────────────┐
       │                              │
       v                              v
┌──────────────┐              ┌───────────────┐
│ CronScheduler│              │  runCheck()   │  (--once mode: called directly)
│  (IScheduler)│──triggers──▶ │               │
└──────────────┘              └───────┬───────┘
                                      │
                         ┌────────────┴────────────┐
                         │                         │
                         v                         v
              ┌─────────────────────┐   ┌─────────────────┐
              │PuppeteerTicketChecker│   │  EmailNotifier  │
              │   (ITicketChecker)  │   │   (INotifier)   │
              └─────────┬───────────┘   └────────┬────────┘
                        │                        │
                        v                        v
               Chromium (headless)         Gmail SMTP
               Scrapes calendar            Sends HTML email
```

## Key Design Decisions

### Dependency Injection via Interfaces
All core components implement interfaces (`ITicketChecker`, `INotifier`, `IScheduler`), making them testable and swappable. Wiring happens in `index.ts`.

### Puppeteer with System Chromium
In the container environment, Puppeteer uses the system-installed Chromium (`/usr/bin/chromium`) instead of downloading its own. This is controlled by:
- `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` (env var in Dockerfile)
- `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium` (env var in Dockerfile)
- `executablePath` read from `process.env.PUPPETEER_EXECUTABLE_PATH` in code

Locally (without the env var), Puppeteer falls back to its bundled Chromium.

### Container Chromium Args
The Puppeteer launch includes `--no-sandbox`, `--disable-setuid-sandbox`, and `--disable-dev-shm-usage` — required for running Chromium in a container where `/dev/shm` is limited and there is no sandbox support.

### Docker Multi-Stage Build
- **Build stage**: installs all dependencies, compiles TypeScript
- **Runtime stage**: installs only production dependencies + system Chromium, copies compiled `dist/`

This keeps the final image smaller by excluding TypeScript, devDependencies, and source files.

### Kubernetes CronJob vs node-cron
The `--once` mode is designed for Kubernetes CronJob, where the scheduler handles retry (`backoffLimit: 2`) and concurrency control (`concurrencyPolicy: Forbid`). This is more robust than running `node-cron` in a long-lived container.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GMAIL_USER` | Gmail address for sending notifications | Yes (for email) |
| `GMAIL_APP_PASSWORD` | Gmail App Password (not regular password) | Yes (for email) |
| `NOTIFY_EMAIL` | Recipient email address(es), comma-separated for multiple | No (defaults to `fankaihsiang11@gmail.com`) |
| `TARGET_DATES` | Target dates to check. Comma-separated, supports ranges with `~`. Example: `2026-03-17~2026-03-23,2026-04-05` | Yes |
| `PUPPETEER_EXECUTABLE_PATH` | Path to Chromium binary | No (set automatically in Docker) |
