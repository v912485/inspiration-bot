import { buildInspirationMessage } from '../src/card';

describe('buildInspirationMessage', () => {
    it('builds a cardsV2 message with header, image and text', () => {
        const message = buildInspirationMessage({
            title: 'Blessings',
            text: 'Line one\nLine two',
            imageUrl: 'https://example.com/image.jpg',
            day: '2026-10-16',
        });

        expect(message).toEqual({
            fallbackText: 'Blessings: Line one\nLine two',
            cardsV2: [{
                cardId: 'inspiration',
                card: {
                    header: { title: 'Blessings', subtitle: 'Inspiration for 16 October 2026' },
                    sections: [{
                        widgets: [
                            { image: { imageUrl: 'https://example.com/image.jpg', altText: 'Blessings' } },
                            { textParagraph: { text: 'Line one<br>Line two' } },
                        ],
                    }],
                },
            }],
        });
    });

    it('omits the image widget when there is no image', () => {
        const message = buildInspirationMessage({ title: 'T', text: 'C', day: '2026-10-16' });

        expect(message.cardsV2![0].card!.sections![0].widgets).toEqual([{ textParagraph: { text: 'C' } }]);
    });

    it('escapes HTML in the text', () => {
        const message = buildInspirationMessage({ title: 'T', text: 'Love & <b>peace</b>', day: '2026-10-16' });

        expect(message.cardsV2![0].card!.sections![0].widgets![0].textParagraph!.text)
            .toBe('Love &amp; &lt;b&gt;peace&lt;/b&gt;');
    });
});
