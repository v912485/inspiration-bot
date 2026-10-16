import { DateTime } from 'luxon';
import cron from 'node-cron';
import { logger } from './utils/logger';

export interface ServiceAccountCredentials {
    client_email: string;
    private_key: string;
}

export interface Config {
    port: number;
    credentials: ServiceAccountCredentials;
    spaceId: string;
    projectNumber: string;
    chatEndpointUrl: string;
    timezone: string;
    cronSchedule?: string;
    task?: {
        audience: string;
        invokerEmail: string;
    };
}

export class ConfigError extends Error {}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
    const problems: string[] = [];
    const read = (name: string) => env[name]?.trim() || undefined;
    const required = (name: string) => {
        const value = read(name);
        if (!value) {
            problems.push(`${name} is required`);
        }
        return value ?? '';
    };

    const clientEmail = required('GOOGLE_CLIENT_EMAIL');
    const privateKey = required('GOOGLE_PRIVATE_KEY').replace(/\\n/g, '\n');

    const spaceId = required('GOOGLE_CHAT_SPACE_ID');
    if (spaceId && !spaceId.startsWith('spaces/')) {
        problems.push('GOOGLE_CHAT_SPACE_ID must look like spaces/XXXX');
    }

    const projectNumber = required('GOOGLE_PROJECT_NUMBER');
    if (projectNumber && !/^\d+$/.test(projectNumber)) {
        problems.push('GOOGLE_PROJECT_NUMBER must be the numeric project number, not the project ID');
    }

    const chatEndpointUrl = required('CHAT_ENDPOINT_URL');
    if (chatEndpointUrl && !chatEndpointUrl.startsWith('https://')) {
        problems.push('CHAT_ENDPOINT_URL must be the https:// URL set as the Chat app\'s HTTP endpoint');
    }

    const port = Number(read('PORT') ?? 3000);
    if (!Number.isInteger(port) || port <= 0) {
        problems.push('PORT must be a positive integer');
    }

    const timezone = read('TIMEZONE') ?? 'Europe/London';
    if (!DateTime.now().setZone(timezone).isValid) {
        problems.push(`TIMEZONE "${timezone}" is not a valid IANA time zone`);
    }

    const cronSchedule = read('CRON_SCHEDULE');
    if (cronSchedule && !cron.validate(cronSchedule)) {
        problems.push(`CRON_SCHEDULE "${cronSchedule}" is not a valid cron expression`);
    }

    const audience = read('TASK_AUDIENCE');
    const invokerEmail = read('TASK_INVOKER_EMAIL');
    if (Boolean(audience) !== Boolean(invokerEmail)) {
        problems.push('TASK_AUDIENCE and TASK_INVOKER_EMAIL must be set together');
    }

    if (problems.length > 0) {
        throw new ConfigError(`Invalid configuration:\n- ${problems.join('\n- ')}`);
    }

    return {
        port,
        credentials: { client_email: clientEmail, private_key: privateKey },
        spaceId,
        projectNumber,
        chatEndpointUrl,
        timezone,
        cronSchedule,
        task: audience && invokerEmail ? { audience, invokerEmail } : undefined,
    };
}

export function loadConfigOrExit(): Config {
    try {
        return loadConfig();
    } catch (error) {
        if (error instanceof ConfigError) {
            logger.error(error.message);
            process.exit(1);
        }
        throw error;
    }
}
