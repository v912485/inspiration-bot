/*
 * Created Date: Wednesday July 13th 2022
 * Author: Allan Schweitz
 * -----
 * Last Modified: Saturday, 2022-08-20 10:24
 * Modified By: Allan Schweitz
 * -----
 * Copyright (c) 2022 Onepoint
 */

import { auth, chat, chat_v1 } from '@googleapis/chat';
import type { ServiceAccountCredentials } from './config';

export interface MessageSender {
    createMessage(message: chat_v1.Schema$Message, messageId?: string): Promise<void>;
}

export class GoogleChatClient implements MessageSender {
    private readonly chat: chat_v1.Chat;

    constructor(credentials: ServiceAccountCredentials, private readonly spaceId: string) {
        const googleAuth = new auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/chat.bot'],
        });
        this.chat = chat({ version: 'v1', auth: googleAuth });
    }

    /**
     * Posts a message to the configured space. A `messageId` must start with "client-";
     * reusing one makes the API reject the message with HTTP 409.
     */
    async createMessage(message: chat_v1.Schema$Message, messageId?: string): Promise<void> {
        await this.chat.spaces.messages.create({
            parent: this.spaceId,
            messageId,
            requestBody: message,
        });
    }
}

export function httpStatusOf(error: unknown): number | undefined {
    const err = error as { status?: unknown; response?: { status?: unknown } } | undefined;
    const status = err?.status ?? err?.response?.status;
    return typeof status === 'number' ? status : undefined;
}
