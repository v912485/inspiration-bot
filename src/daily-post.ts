import { DateTime } from 'luxon';
import { buildInspirationMessage } from './card';
import { httpStatusOf, MessageSender } from './google-chat-client';
import type { Thought } from './thought';
import { logger } from './utils/logger';

export type DailyPostResult = 'posted' | 'already-posted' | 'not-published-yet';

export interface DailyPosterDeps {
    chat: MessageSender;
    fetchThought: () => Promise<Thought>;
    timezone: string;
    now?: () => DateTime;
}

/**
 * Returns a function that posts today's thought to the space at most once per day, however
 * often it is called. It is safe to call from several instances or after a restart.
 */
export function createDailyPoster({ chat, fetchThought, timezone, now = () => DateTime.now() }: DailyPosterDeps) {
    // Only saves API calls on this instance. The date-based message ID is what prevents duplicates.
    let lastPostedDay: string | undefined;

    return async function postDailyInspiration(): Promise<DailyPostResult> {
        const today = now().setZone(timezone).toISODate()!;
        if (lastPostedDay === today) {
            return 'already-posted';
        }

        const thought = await fetchThought();
        if (thought.day !== today) {
            logger.info(`Lighthouse thought is for ${thought.day}, not today (${today}); will try again later`);
            return 'not-published-yet';
        }

        let result: DailyPostResult = 'posted';
        try {
            await chat.createMessage(buildInspirationMessage(thought), `client-inspiration-${today}`);
            logger.info(`Posted inspiration for ${today}`);
        } catch (error) {
            if (httpStatusOf(error) !== 409) {
                throw error;
            }
            logger.info(`Inspiration for ${today} was already posted`);
            result = 'already-posted';
        }
        lastPostedDay = today;
        return result;
    };
}

export function logPostFailure(error: unknown): void {
    const status = httpStatusOf(error);
    if (status === 403 || status === 404) {
        logger.warn(`Google Chat refused the post (HTTP ${status}): ${(error as Error).message}. `
            + 'Check that the app has been added to GOOGLE_CHAT_SPACE_ID and that the service account belongs to the Chat app\'s project.');
    } else {
        logger.error('Failed to post daily inspiration', error);
    }
}
