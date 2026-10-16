import axios from 'axios';
import { fetchThought } from '../src/thought';

jest.mock('axios');
const mockedGet = axios.get as jest.Mock;

describe('fetchThought', () => {
    afterEach(() => mockedGet.mockReset());

    it('maps the Lighthouse reflection to a thought', async () => {
        mockedGet.mockResolvedValue({
            data: {
                title: 'Blessings',
                content: 'We are uplifted.\nToday let me bring benefit.',
                featuredImage: 'https://example.com/image.jpg',
                day: '2026-10-16',
                language: 'en',
            },
        });

        await expect(fetchThought()).resolves.toEqual({
            title: 'Blessings',
            text: 'We are uplifted.\nToday let me bring benefit.',
            imageUrl: 'https://example.com/image.jpg',
            day: '2026-10-16',
        });
        expect(mockedGet).toHaveBeenCalledWith(
            'https://admin.thelighthouse.world/lighthouse/reflectionOfToday',
            expect.objectContaining({ timeout: expect.any(Number) }),
        );
    });

    it('leaves out a missing image', async () => {
        mockedGet.mockResolvedValue({ data: { title: 'T', content: 'C', featuredImage: null, day: '2026-10-16' } });

        await expect(fetchThought()).resolves.toEqual({ title: 'T', text: 'C', imageUrl: undefined, day: '2026-10-16' });
    });

    it.each([
        ['no title', { content: 'C', day: '2026-10-16' }],
        ['no content', { title: 'T', day: '2026-10-16' }],
        ['an invalid day', { title: 'T', content: 'C', day: 'yesterday' }],
    ])('rejects a response with %s', async (_label, data) => {
        mockedGet.mockResolvedValue({ data });

        await expect(fetchThought()).rejects.toThrow('Unexpected response from the Lighthouse API');
    });

    it('passes on request failures', async () => {
        mockedGet.mockRejectedValue(new Error('timeout of 10000ms exceeded'));

        await expect(fetchThought()).rejects.toThrow('timeout');
    });
});
