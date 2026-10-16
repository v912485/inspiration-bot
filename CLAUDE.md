# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

TypeScript/Node.js (22+) Google Chat bot. It posts the daily thought from the Lighthouse API (`admin.thelighthouse.world/.../reflectionOfToday`) as a `cardsV2` card to one Chat space, and replies with it when users ask for "inspiration". It was ported from a Discord bot; git history before the `google-chat` branch is the Discord version.

## Commands

```bash
npm run dev            # run the server with ts-node (reads .env)
npm run post           # post today's thought once and exit (src/post-now.ts) - posts to the real space
npm run build          # clean dist/ and compile
npm start              # run the compiled server (node dist/main.js)
npm test               # jest (ts-jest), tests in tests/*.test.ts
npx jest tests/daily-post.test.ts         # single file
npx jest -t "treats a duplicate"          # single test by name
```

There is no linter. `tsc` only compiles `src/`; ts-jest type-checks the tests.

## Architecture

- **Composition**: `main.ts` (server) and `post-now.ts` (one-off) build the real dependencies. Everything else receives them as arguments, which is how the tests substitute fakes. `app.ts` (`createApp`) wires the Express routes. Tests drive it with supertest, using stub token verifiers.
- **Daily post** (`daily-post.ts`): `createDailyPoster` posts only when the Lighthouse `day` equals today in `TIMEZONE`. It creates the message with ID `client-inspiration-YYYY-MM-DD`; the Chat API rejects a reused ID with HTTP 409, which is treated as "already posted". That ID is the real duplicate guard, across restarts and instances. The in-memory `lastPostedDay` only saves API calls. Keep this property when changing the posting path.
- **Triggers**: Cloud Scheduler calls `POST /tasks/daily` (enabled only when `TASK_AUDIENCE` and `TASK_INVOKER_EMAIL` are set). Optionally, `CRON_SCHEDULE` runs node-cron in-process. Cron is not reliable on Cloud Run, which stops idle instances.
- **Webhook** (`controllers/webhook.controller.ts`): the Chat app is a **Google Workspace add-on** (the current console has no other option), so events arrive as `{ chat: { messagePayload | addedToSpacePayload | appCommandPayload } }`. Replies must be wrapped in `hostAppDataAction.chatDataAction.createMessageAction.message`. The reply goes back as the response body, so it lands in the conversation that asked; it does not use the API. It matches on `argumentText` because the bot's own @mention ("Inspiration bot") would otherwise match "inspiration".
- **Auth** (`auth.ts`): `requireBearerToken` guards both POST routes, and both use `googleIdTokenVerifier`, which checks a Google OIDC ID token's audience and `email`.
  - **Chat events**: audience `CHAT_ENDPOINT_URL` (exactly the configured HTTP endpoint URL), email `service-<GOOGLE_PROJECT_NUMBER>@gcp-sa-gsuiteaddons.iam.gserviceaccount.com`.
  - **Cloud Scheduler**: audience `TASK_AUDIENCE`, email `TASK_INVOKER_EMAIL`.
- **Chat client** (`google-chat-client.ts`): uses `@googleapis/chat` (not the full `googleapis`) with service-account credentials and the `chat.bot` scope. It always posts to `GOOGLE_CHAT_SPACE_ID`. `httpStatusOf` pulls the HTTP status out of gaxios errors; use it rather than matching error text.
- **Config** (`config.ts`): `loadConfig(env)` validates everything and throws one `ConfigError` listing every problem. The entry points call `loadConfigOrExit()`. Add new settings here, and to `env.example` and the README tables.
- **Logging**: use the Winston `logger` (`utils/logger.ts`). It is silent when `NODE_ENV=test`.

## Deployment

The README covers it. In short: the `Dockerfile` runs on Cloud Run with `--allow-unauthenticated` (Google Chat must reach `/webhook`, and the app checks tokens itself), and Cloud Scheduler runs every 30 minutes, 06:00–12:30 Europe/London. `.gcloudignore` includes `.gitignore`, so `.env` and key files aren't uploaded.

## Gotchas

- `.gitignore` ignores every `*.json` at the repo root except `package.json`, `package-lock.json` and `tsconfig.json`, because service-account keys are downloaded there (for example `inspiration-bot-ng-*.json`). Add an exception for any new root-level JSON file that should be committed.
- The old file-header comment style (Created Date / Author / Copyright Onepoint) is only in `main.ts` and `google-chat-client.ts`; newer files don't use it.
