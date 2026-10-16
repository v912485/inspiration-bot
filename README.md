# Inspiration Bot for Google Chat

A Google Chat bot that posts the daily thought from [The Lighthouse](https://thelighthouse.world) to a Chat space, and replies with it when people ask.

## Features

- **Daily post**: posts today's thought as a card once a day. Posting is idempotent: each day's message has a fixed ID, so repeated triggers, restarts or several instances never post twice.
- **On request**: replies in the conversation when someone mentions "inspiration" (or uses an `/inspiration` slash command, if you configure one).
- **Verified requests**: the webhook only accepts events signed by Google Chat, and the daily-post endpoint only accepts calls from your Cloud Scheduler service account.

## Prerequisites

- Node.js 22 or later
- A Google Cloud project
- A Google Workspace account with Google Chat

## Setup

### 1. Google Cloud project

1. Create a Google Cloud project, or use an existing one. Note its **project number** (shown on the project dashboard).
2. Enable the **Google Chat API** under APIs & Services > Library.

### 2. Service account

1. Go to APIs & Services > Credentials > Create Credentials > Service Account.
2. Create a JSON key for it. Copy `client_email` and `private_key` into your `.env`, then delete the key file or keep it outside the repository.

### 3. Environment

Copy `env.example` to `.env` and fill it in:

```bash
GOOGLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_CHAT_SPACE_ID=spaces/your-space-id
GOOGLE_PROJECT_NUMBER=123456789012
CHAT_ENDPOINT_URL=https://your-service-url/webhook
```

**Finding the space ID:** open the space in [Google Chat](https://chat.google.com/). The URL looks like `https://chat.google.com/room/AAAAxxxxxxx`; prefix the last part with `spaces/` (for example `spaces/AAAAxxxxxxx`).

The app checks its configuration on startup and exits listing anything missing or invalid.

### 4. Chat app configuration

In the Cloud Console, go to **APIs & Services > Google Chat API > Configuration**. The console builds Chat apps as Google Workspace add-ons, which is the event format this bot handles.

- **App status**: LIVE.
- **App name, avatar, description**: for example "Inspiration Bot" and "Posts a daily inspiration".
- **Interactive features**: enable them, and tick **Join spaces and group conversations**.
- **Connection settings**: HTTP endpoint URL, with a common URL for all triggers that reaches the bot's `/webhook` route, for example `https://your-service-url/webhook`. Set `CHAT_ENDPOINT_URL` to exactly the same URL: Google uses it as the token audience, and the bot rejects tokens issued for any other URL.
- **Commands** (optional): add a command such as `/inspiration`; any command replies with today's thought.
- **Visibility**: make the app available to the people or groups who should use it.

Then add the app to the space set in `GOOGLE_CHAT_SPACE_ID` (in Chat: **Apps & integrations > Add apps**).

## Development

```bash
npm install
npm run dev     # start the server with ts-node
npm run post    # post today's thought to the space once and exit
npm test        # run the tests
npm run build   # compile to dist/
```

Google Chat can only reach the webhook at a public HTTPS URL, so test interactive replies on a deployed instance (or through a tunnel).

## Deployment

### Google Cloud Run

1. Deploy (the `Dockerfile` builds the app; `.gcloudignore` keeps `.env` and keys out of the upload):

   ```bash
   gcloud run deploy inspiration-bot \
     --source . \
     --region europe-west2 \
     --allow-unauthenticated \
     --set-env-vars GOOGLE_CLIENT_EMAIL=...,GOOGLE_CHAT_SPACE_ID=spaces/...,GOOGLE_PROJECT_NUMBER=... \
     --set-secrets GOOGLE_PRIVATE_KEY=inspiration-bot-key:latest
   ```

   `--allow-unauthenticated` is needed so Google Chat can call the webhook; the app checks the tokens itself. Keep the private key in Secret Manager rather than a plain environment variable.

2. Schedule the daily post. Cloud Run stops idle instances, so use Cloud Scheduler rather than a timer inside the app:

   ```bash
   gcloud iam service-accounts create inspiration-scheduler

   gcloud scheduler jobs create http inspiration-daily \
     --location europe-west2 \
     --schedule "*/30 6-12 * * *" \
     --time-zone "Europe/London" \
     --http-method POST \
     --uri "https://your-service-url/tasks/daily" \
     --oidc-service-account-email inspiration-scheduler@your-project.iam.gserviceaccount.com \
     --oidc-token-audience "https://your-service-url/tasks/daily"
   ```

   Then set `TASK_AUDIENCE` (the URI above) and `TASK_INVOKER_EMAIL` (the scheduler service account) on the Cloud Run service. The job runs every 30 minutes in the morning because Lighthouse publishes the new thought at varying times; the bot posts on the first run that sees today's thought and ignores the rest.

### Other hosts

On a host that keeps the process running, set `CRON_SCHEDULE` (for example `*/30 6-12 * * *`) to schedule inside the app, or run `node dist/post-now.js` from the host's own scheduler. Start the server with `npm run build && npm start`.

## Endpoints

| Endpoint | Purpose | Authentication |
|----------|---------|----------------|
| `POST /webhook` | Google Chat events | Google ID token from `service-<project number>@gcp-sa-gsuiteaddons.iam.gserviceaccount.com` for `CHAT_ENDPOINT_URL` |
| `POST /tasks/daily` | Posts today's thought if not yet posted. Only exposed when `TASK_AUDIENCE` is set | Cloud Scheduler OIDC token |
| `GET /health` | Health check | None |

## Environment variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GOOGLE_CLIENT_EMAIL` | Service account email | Yes |
| `GOOGLE_PRIVATE_KEY` | Service account private key (`\n` escapes are allowed) | Yes |
| `GOOGLE_CHAT_SPACE_ID` | Space for the daily post, as `spaces/...` | Yes |
| `GOOGLE_PROJECT_NUMBER` | Project number of the Chat app's project | Yes |
| `CHAT_ENDPOINT_URL` | The Chat app's HTTP endpoint URL, exactly as configured | Yes |
| `TIMEZONE` | Time zone that decides what "today" is (default `Europe/London`) | No |
| `PORT` | Server port (default `3000`; Cloud Run sets it) | No |
| `TASK_AUDIENCE` | URL Cloud Scheduler uses as the token audience | With `TASK_INVOKER_EMAIL` |
| `TASK_INVOKER_EMAIL` | Service account Cloud Scheduler calls as | With `TASK_AUDIENCE` |
| `CRON_SCHEDULE` | In-process schedule, for hosts without Cloud Scheduler | No |

## Troubleshooting

- **The app exits on startup**: the log lists the missing or invalid settings.
- **Webhook returns 401**: check that `CHAT_ENDPOINT_URL` matches the configured HTTP endpoint URL character for character (scheme, host, port, path), and that `GOOGLE_PROJECT_NUMBER` is the Chat app's project. The log line "Rejected request to /webhook" gives the reason.
- **The app isn't listed under Add apps**: check that it is LIVE, that **Join spaces and group conversations** is ticked, that you are under Visibility, and that the page was saved. Changes can take a while to show up. If it still isn't listed, your Workspace admin may be restricting Chat apps.
- **"Google Chat refused the post (HTTP 403/404)"**: the app hasn't been added to `GOOGLE_CHAT_SPACE_ID`, or the ID is wrong.
- **"Lighthouse thought is for ..., not today"**: Lighthouse hasn't published today's thought yet; a later scheduled run will post it.

Logs on Cloud Run:

```bash
gcloud run services logs read inspiration-bot --region europe-west2
```
