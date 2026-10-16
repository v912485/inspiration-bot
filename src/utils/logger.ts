import winston from 'winston';

export const logger = winston.createLogger({
    level: 'info',
    silent: process.env.NODE_ENV === 'test',
    format: winston.format.combine(
        winston.format.errors({ stack: true }),
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.simple(),
        }),
    ],
});
