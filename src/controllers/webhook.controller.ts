import type { chat_v1 } from '@googleapis/chat';
import type { RequestHandler } from 'express';
import { buildInspirationMessage } from '../card';
import type { Thought } from '../thought';
import { logger } from '../utils/logger';

interface ChatMessage {
    text?: string;
    argumentText?: string;
}

/** The parts of a Google Workspace add-on event for Chat that the bot uses. */
interface AddOnEvent {
    chat?: {
        messagePayload?: { message?: ChatMessage };
        addedToSpacePayload?: object;
        appCommandPayload?: object;
    };
}

const WELCOME = 'Hi! Ask me for *inspiration* any time to see today\'s thought.';
const HELP = 'Ask me for *inspiration* to see today\'s thought.';
const FETCH_FAILED = 'Sorry, I couldn\'t fetch today\'s inspiration. Please try again later.';

function asksForInspiration(message: ChatMessage | undefined): boolean {
    // argumentText leaves out the @mention, which would otherwise match "Inspiration bot".
    return /inspiration/i.test(message?.argumentText ?? message?.text ?? '');
}

// Add-ons reply by wrapping the message in a "create message" action.
function reply(message: chat_v1.Schema$Message) {
    return { hostAppDataAction: { chatDataAction: { createMessageAction: { message } } } };
}

/** Handles Google Chat events. Replies go in the response body, so they appear where the user asked. */
export function createWebhookHandler(fetchThought: () => Promise<Thought>): RequestHandler {
    return async (req, res) => {
        const chat = (req.body as AddOnEvent | undefined)?.chat;
        try {
            if (chat?.appCommandPayload || (chat?.messagePayload && asksForInspiration(chat.messagePayload.message))) {
                res.json(reply(buildInspirationMessage(await fetchThought())));
            } else if (chat?.messagePayload) {
                res.json(reply({ text: HELP }));
            } else if (chat?.addedToSpacePayload) {
                res.json(reply({ text: WELCOME }));
            } else {
                res.json({});
            }
        } catch (error) {
            logger.error('Error handling Chat event', error);
            res.json(reply({ text: FETCH_FAILED }));
        }
    };
}
