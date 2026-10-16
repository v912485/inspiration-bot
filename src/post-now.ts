// Posts today's thought once and exits. Useful for testing, or for hosts with their own scheduler.
import 'dotenv/config';
import { loadConfigOrExit } from './config';
import { createDailyPoster, logPostFailure } from './daily-post';
import { GoogleChatClient } from './google-chat-client';
import { fetchThought } from './thought';
import { logger } from './utils/logger';

const config = loadConfigOrExit();

const postDailyInspiration = createDailyPoster({
    chat: new GoogleChatClient(config.credentials, config.spaceId),
    fetchThought,
    timezone: config.timezone,
});

postDailyInspiration()
    .then(result => logger.info(`Result: ${result}`))
    .catch(error => {
        logPostFailure(error);
        process.exitCode = 1;
    });
