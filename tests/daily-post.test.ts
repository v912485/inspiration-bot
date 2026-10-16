import { DateTime } from 'luxon';
import { createDailyPoster } from '../src/daily-post';
import type { Thought } from '../src/thought';

const thoughtFor = (day: string): Thought => ({ title: 'Blessings', text: 'Text', day });
const conflict = () => Object.assign(new Error('Message already exists'), { status: 409 });

function setup(nowIso: string, day: string, timezone = 'Europe/London') {
    const createMessage = jest.fn().mockResolvedValue(undefined);
    const fetchThought = jest.fn().mockResolvedValue(thoughtFor(day));
    const post = createDailyPoster({
        chat: { createMessage },
        fetchThought,
        timezone,
        now: () => DateTime.fromISO(nowIso, { zone: 'utc' }),
    });
    return { post, createMessage, fetchThought };
}

describe('createDailyPoster', () => {
    it("posts today's thought with a message ID based on the date", async () => {
        const { post, createMessage } = setup('2026-10-16T06:00:00Z', '2026-10-16');

        await expect(post()).resolves.toBe('posted');
        expect(createMessage).toHaveBeenCalledTimes(1);
        expect(createMessage).toHaveBeenCalledWith(
            expect.objectContaining({ cardsV2: expect.any(Array) }),
            'client-inspiration-2026-10-16',
        );
    });

    it('waits when Lighthouse has not published today\'s thought yet', async () => {
        const { post, createMessage } = setup('2026-10-16T06:00:00Z', '2026-10-15');

        await expect(post()).resolves.toBe('not-published-yet');
        expect(createMessage).not.toHaveBeenCalled();
    });

    it('decides what "today" is in the configured time zone', async () => {
        // 23:30 UTC on the 15th is already the 16th in London during summer time.
        const { post, createMessage } = setup('2026-07-15T23:30:00Z', '2026-07-16');

        await expect(post()).resolves.toBe('posted');
        expect(createMessage).toHaveBeenCalledWith(expect.anything(), 'client-inspiration-2026-07-16');
    });

    it('treats a duplicate message ID as already posted', async () => {
        const { post, createMessage } = setup('2026-10-16T06:00:00Z', '2026-10-16');
        createMessage.mockRejectedValue(conflict());

        await expect(post()).resolves.toBe('already-posted');
    });

    it('does not call the APIs again once it has posted today', async () => {
        const { post, createMessage, fetchThought } = setup('2026-10-16T06:00:00Z', '2026-10-16');

        await post();
        await expect(post()).resolves.toBe('already-posted');
        expect(fetchThought).toHaveBeenCalledTimes(1);
        expect(createMessage).toHaveBeenCalledTimes(1);
    });

    it('passes on other Chat API errors and tries again next time', async () => {
        const { post, createMessage } = setup('2026-10-16T06:00:00Z', '2026-10-16');
        createMessage.mockRejectedValueOnce(Object.assign(new Error('Forbidden'), { status: 403 }));

        await expect(post()).rejects.toThrow('Forbidden');
        await expect(post()).resolves.toBe('posted');
        expect(createMessage).toHaveBeenCalledTimes(2);
    });
});
