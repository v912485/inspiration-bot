import { OAuth2Client } from 'google-auth-library';
import { chatAddOnServiceAccount, googleIdTokenVerifier } from '../src/auth';

afterEach(() => jest.restoreAllMocks());

const ticketFor = (payload: object) => ({ getPayload: () => payload }) as never;
const addOnAccount = 'service-123456789012@gcp-sa-gsuiteaddons.iam.gserviceaccount.com';

describe('chatAddOnServiceAccount', () => {
    it('derives the add-on service account from the project number', () => {
        expect(chatAddOnServiceAccount('123456789012')).toBe(addOnAccount);
    });
});

describe('googleIdTokenVerifier', () => {
    it('accepts a verified token for the audience from the expected account', async () => {
        const verify = jest.spyOn(OAuth2Client.prototype, 'verifyIdToken')
            .mockResolvedValue(ticketFor({ email: addOnAccount, email_verified: true }));

        await googleIdTokenVerifier('https://bot.example.com/webhook', addOnAccount)('token');

        expect(verify).toHaveBeenCalledWith({ idToken: 'token', audience: 'https://bot.example.com/webhook' });
    });

    it('rejects tokens issued to other accounts', async () => {
        jest.spyOn(OAuth2Client.prototype, 'verifyIdToken')
            .mockResolvedValue(ticketFor({ email: 'someone@example.com', email_verified: true }));

        await expect(googleIdTokenVerifier('https://bot.example.com/webhook', addOnAccount)('token'))
            .rejects.toThrow('someone@example.com');
    });

    it('rejects unverified email addresses', async () => {
        jest.spyOn(OAuth2Client.prototype, 'verifyIdToken')
            .mockResolvedValue(ticketFor({ email: addOnAccount, email_verified: false }));

        await expect(googleIdTokenVerifier('https://bot.example.com/webhook', addOnAccount)('token')).rejects.toThrow();
    });

    it('rejects tokens that fail signature or audience checks', async () => {
        jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockRejectedValue(new Error('Wrong recipient') as never);

        await expect(googleIdTokenVerifier('https://bot.example.com/webhook', addOnAccount)('token'))
            .rejects.toThrow('Wrong recipient');
    });
});
