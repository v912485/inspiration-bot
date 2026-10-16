/*
 * Created Date: Wednesday July 13th 2022
 * Author: Allan Schweitz
 * -----
 * Last Modified: Saturday, 2022-08-20 10:47
 * Modified By: Allan Schweitz
 * -----
 * Copyright (c) 2022 Onepoint
 */
import 'dotenv/config';
import cron from 'node-cron';
import { createApp } from './app';
import { chatAddOnServiceAccount, googleIdTokenVerifier } from './auth';
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

const app = createApp({
    fetchThought,
    postDailyInspiration,
    verifyChatToken: googleIdTokenVerifier(config.chatEndpointUrl, chatAddOnServiceAccount(config.projectNumber)),
    verifySchedulerToken: config.task && googleIdTokenVerifier(config.task.audience, config.task.invokerEmail),
});

if (config.cronSchedule) {
    cron.schedule(config.cronSchedule, () => postDailyInspiration().catch(logPostFailure), {
        timezone: config.timezone,
        noOverlap: true,
    });
    logger.info(`In-process schedule enabled: ${config.cronSchedule} (${config.timezone})`);
}
if (!config.cronSchedule && !config.task) {
    logger.warn('No schedule configured, so nothing will be posted automatically. Set TASK_AUDIENCE and TASK_INVOKER_EMAIL for Cloud Scheduler, or CRON_SCHEDULE.');
}

app.listen(config.port, () => {
    logger.info(`Inspiration bot running on port ${config.port}`);
});
