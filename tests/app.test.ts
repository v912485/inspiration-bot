import request from 'supertest';
import { AppDeps, createApp } from '../src/app';
import type { Thought } from '../src/thought';

const thought: Thought = { title: 'Blessings', text: 'Text', imageUrl: 'https://example.com/i.jpg', day: '2026-10-16' };

function setup(overrides: Partial<AppDeps> = {}) {
    const deps = {
        fetchThought: jest.fn().mockResolvedValue(thought),
        postDailyInspiration: jest.fn().mockResolvedValue('posted'),
        verifyChatToken: jest.fn(async (token: string) => {
            if (token !== 'chat-token') throw new Error('bad token');
        }),
        verifySchedulerToken: jest.fn(async (token: string) => {
            if (token !== 'scheduler-token') throw new Error('bad token');
        }),
        ...overrides,
    };
    return { app: createApp(deps), deps };
}

const chatEvent = (body: object) => request(setup().app).post('/webhook').set('Authorization', 'Bearer chat-token').send(body);

describe('GET /health', () => {
    it('responds OK', async () => {
        await request(setup().app).get('/health').expect(200, 'OK');
    });
});

const messageOf = (body: any) => body.hostAppDataAction.chatDataAction.createMessageAction.message;

describe('POST /webhook', () => {
    it('rejects requests without a bearer token', async () => {
        const { app, deps } = setup();

        await request(app).post('/webhook').send({ chat: { messagePayload: {} } }).expect(401);
        expect(deps.fetchThought).not.toHaveBeenCalled();
    });

    it('rejects requests whose token fails verification', async () => {
        const { app, deps } = setup();

        await request(app).post('/webhook').set('Authorization', 'Bearer forged').send({ chat: { messagePayload: {} } }).expect(401);
        expect(deps.verifyChatToken).toHaveBeenCalledWith('forged');
    });

    it.each([
        ['a message mentioning inspiration', { messagePayload: { message: { text: '@Inspiration bot inspiration please', argumentText: ' inspiration please' } } }],
        ['a direct message', { messagePayload: { message: { text: 'Inspiration?' } } }],
        ['an app command', { appCommandPayload: { appCommandMetadata: { appCommandId: 1 } } }],
    ])('replies to %s with the card in the response', async (_label, chat) => {
        const res = await chatEvent({ chat }).expect(200);

        expect(messageOf(res.body).cardsV2[0].card.header.title).toBe('Blessings');
    });

    it('does not treat the bot\'s own name in a mention as a request', async () => {
        const res = await chatEvent({
            chat: { messagePayload: { message: { text: '@Inspiration bot hello', argumentText: ' hello' } } },
        }).expect(200);

        expect(messageOf(res.body)).toEqual({ text: expect.stringContaining('Ask me for *inspiration*') });
    });

    it('welcomes users when added to a space', async () => {
        const res = await chatEvent({ chat: { addedToSpacePayload: { space: { name: 'spaces/A' } } } }).expect(200);

        expect(messageOf(res.body).text).toContain('Hi!');
    });

    it('returns an empty JSON response for other events', async () => {
        await chatEvent({ chat: { removedFromSpacePayload: {} } }).expect(200, {});
    });

    it('apologises when the thought cannot be fetched', async () => {
        const { app } = setup({ fetchThought: jest.fn().mockRejectedValue(new Error('down')) });

        const res = await request(app)
            .post('/webhook')
            .set('Authorization', 'Bearer chat-token')
            .send({ chat: { messagePayload: { message: { argumentText: 'inspiration' } } } })
            .expect(200);

        expect(messageOf(res.body).text).toContain('Sorry');
    });
});

describe('POST /tasks/daily', () => {
    it('is not exposed when Cloud Scheduler is not configured', async () => {
        const { app } = setup({ verifySchedulerToken: undefined });

        await request(app).post('/tasks/daily').set('Authorization', 'Bearer scheduler-token').expect(404);
    });

    it('rejects callers without a valid token', async () => {
        const { app, deps } = setup();

        await request(app).post('/tasks/daily').expect(401);
        await request(app).post('/tasks/daily').set('Authorization', 'Bearer chat-token').expect(401);
        expect(deps.postDailyInspiration).not.toHaveBeenCalled();
    });

    it('runs the daily post and reports the result', async () => {
        const { app } = setup();

        await request(app).post('/tasks/daily').set('Authorization', 'Bearer scheduler-token').expect(200, { result: 'posted' });
    });

    it('returns 500 when posting fails so Cloud Scheduler retries', async () => {
        const { app } = setup({ postDailyInspiration: jest.fn().mockRejectedValue(new Error('boom')) });

        await request(app).post('/tasks/daily').set('Authorization', 'Bearer scheduler-token').expect(500);
    });
});
