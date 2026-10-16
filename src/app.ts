import express from 'express';
import { requireBearerToken, TokenVerifier } from './auth';
import { createWebhookHandler } from './controllers/webhook.controller';
import { DailyPostResult, logPostFailure } from './daily-post';
import type { Thought } from './thought';

export interface AppDeps {
    fetchThought: () => Promise<Thought>;
    postDailyInspiration: () => Promise<DailyPostResult>;
    verifyChatToken: TokenVerifier;
    /** When omitted, POST /tasks/daily is not exposed. */
    verifySchedulerToken?: TokenVerifier;
}

export function createApp(deps: AppDeps): express.Express {
    const app = express();
    app.disable('x-powered-by');
    app.use(express.json());

    app.get('/health', (_req, res) => {
        res.status(200).send('OK');
    });

    // Google Chat events (messages, being added to a space)
    app.post('/webhook', requireBearerToken(deps.verifyChatToken), createWebhookHandler(deps.fetchThought));

    // Called by Cloud Scheduler. Safe to call repeatedly: it posts at most once per day.
    if (deps.verifySchedulerToken) {
        app.post('/tasks/daily', requireBearerToken(deps.verifySchedulerToken), async (_req, res) => {
            try {
                res.json({ result: await deps.postDailyInspiration() });
            } catch (error) {
                logPostFailure(error);
                res.status(500).json({ error: 'Failed to post inspiration' });
            }
        });
    }

    return app;
}
