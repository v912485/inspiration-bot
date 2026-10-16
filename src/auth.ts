import type { RequestHandler } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { logger } from './utils/logger';

/** Resolves if the bearer token is acceptable, rejects otherwise. */
export type TokenVerifier = (token: string) => Promise<void>;

/** The service account Google uses to call a Chat app built as a Google Workspace add-on. */
export function chatAddOnServiceAccount(projectNumber: string): string {
    return `service-${projectNumber}@gcp-sa-gsuiteaddons.iam.gserviceaccount.com`;
}

/**
 * Verifies a Google-signed OIDC ID token issued to `email` for `audience`. Used both for
 * Google Chat events (audience: the app's HTTP endpoint URL) and for Cloud Scheduler.
 */
export function googleIdTokenVerifier(audience: string, email: string): TokenVerifier {
    const client = new OAuth2Client();

    return async token => {
        const ticket = await client.verifyIdToken({ idToken: token, audience });
        const payload = ticket.getPayload();
        if (!payload?.email_verified || payload.email !== email) {
            throw new Error(`token was issued to ${payload?.email ?? 'an unknown account'}, not ${email}`);
        }
    };
}

export function requireBearerToken(verify: TokenVerifier): RequestHandler {
    return async (req, res, next) => {
        const match = /^Bearer (\S+)$/.exec(req.get('authorization') ?? '');
        if (!match) {
            res.status(401).json({ error: 'Missing bearer token' });
            return;
        }
        try {
            await verify(match[1]);
        } catch (error) {
            logger.warn(`Rejected request to ${req.path}: ${(error as Error).message}`);
            res.status(401).json({ error: 'Invalid bearer token' });
            return;
        }
        next();
    };
}
