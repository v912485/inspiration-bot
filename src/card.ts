import type { chat_v1 } from '@googleapis/chat';
import { DateTime } from 'luxon';
import type { Thought } from './thought';

export function formatDay(day: string): string {
    return DateTime.fromISO(day).setLocale('en-GB').toLocaleString(DateTime.DATE_FULL);
}

// Card text is rendered as simple HTML, so escape it and turn line breaks into <br>.
function toCardHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\r?\n/g, '<br>');
}

export function buildInspirationMessage(thought: Thought): chat_v1.Schema$Message {
    const widgets: chat_v1.Schema$GoogleAppsCardV1Widget[] = [];
    if (thought.imageUrl) {
        widgets.push({ image: { imageUrl: thought.imageUrl, altText: thought.title } });
    }
    widgets.push({ textParagraph: { text: toCardHtml(thought.text) } });

    return {
        fallbackText: `${thought.title}: ${thought.text}`,
        cardsV2: [{
            cardId: 'inspiration',
            card: {
                header: {
                    title: thought.title,
                    subtitle: `Inspiration for ${formatDay(thought.day)}`,
                },
                sections: [{ widgets }],
            },
        }],
    };
}
