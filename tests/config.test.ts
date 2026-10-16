import { ConfigError, loadConfig } from '../src/config';

const validEnv = {
    GOOGLE_CLIENT_EMAIL: 'bot@project.iam.gserviceaccount.com',
    GOOGLE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n',
    GOOGLE_CHAT_SPACE_ID: 'spaces/AAAA1234',
    GOOGLE_PROJECT_NUMBER: '123456789012',
    CHAT_ENDPOINT_URL: 'https://bot.example.com/webhook',
};

describe('loadConfig', () => {
    it('loads a minimal configuration with defaults', () => {
        const config = loadConfig(validEnv);

        expect(config).toEqual({
            port: 3000,
            credentials: {
                client_email: 'bot@project.iam.gserviceaccount.com',
                private_key: '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n',
            },
            spaceId: 'spaces/AAAA1234',
            projectNumber: '123456789012',
            chatEndpointUrl: 'https://bot.example.com/webhook',
            timezone: 'Europe/London',
            cronSchedule: undefined,
            task: undefined,
        });
    });

    it('reads the optional settings', () => {
        const config = loadConfig({
            ...validEnv,
            PORT: '8080',
            TIMEZONE: 'America/New_York',
            CRON_SCHEDULE: '*/30 6-12 * * *',
            TASK_AUDIENCE: 'https://bot.example.com/tasks/daily',
            TASK_INVOKER_EMAIL: 'scheduler@project.iam.gserviceaccount.com',
        });

        expect(config.port).toBe(8080);
        expect(config.timezone).toBe('America/New_York');
        expect(config.cronSchedule).toBe('*/30 6-12 * * *');
        expect(config.task).toEqual({
            audience: 'https://bot.example.com/tasks/daily',
            invokerEmail: 'scheduler@project.iam.gserviceaccount.com',
        });
    });

    it('reports every missing required setting at once', () => {
        expect(() => loadConfig({})).toThrow(ConfigError);
        expect(() => loadConfig({ GOOGLE_PRIVATE_KEY: '  ' })).toThrow(new RegExp([
            'GOOGLE_CLIENT_EMAIL is required',
            'GOOGLE_PRIVATE_KEY is required',
            'GOOGLE_CHAT_SPACE_ID is required',
            'GOOGLE_PROJECT_NUMBER is required',
            'CHAT_ENDPOINT_URL is required',
        ].join('[\\s\\S]*')));
    });

    it.each([
        [{ GOOGLE_CHAT_SPACE_ID: 'AAAA1234' }, 'GOOGLE_CHAT_SPACE_ID must look like spaces/XXXX'],
        [{ GOOGLE_PROJECT_NUMBER: 'my-project' }, 'GOOGLE_PROJECT_NUMBER must be the numeric project number'],
        [{ CHAT_ENDPOINT_URL: 'http://bot.example.com/webhook' }, 'CHAT_ENDPOINT_URL must be the https:// URL'],
        [{ PORT: 'abc' }, 'PORT must be a positive integer'],
        [{ TIMEZONE: 'Mars/Olympus' }, 'TIMEZONE "Mars/Olympus" is not a valid IANA time zone'],
        [{ CRON_SCHEDULE: 'every morning' }, 'CRON_SCHEDULE "every morning" is not a valid cron expression'],
        [{ TASK_AUDIENCE: 'https://bot.example.com/tasks/daily' }, 'TASK_AUDIENCE and TASK_INVOKER_EMAIL must be set together'],
    ])('rejects invalid value %o', (override, expected) => {
        expect(() => loadConfig({ ...validEnv, ...override })).toThrow(expected);
    });
});
