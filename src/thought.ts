import axios from 'axios';
import { DateTime } from 'luxon';

const LIGHTHOUSE_URL = 'https://admin.thelighthouse.world/lighthouse/reflectionOfToday';

export interface Thought {
    title: string;
    text: string;
    imageUrl?: string;
    /** The calendar date the thought is for, as YYYY-MM-DD. */
    day: string;
}

interface LighthouseReflection {
    title?: string;
    content?: string;
    featuredImage?: string | null;
    day?: string;
}

export async function fetchThought(): Promise<Thought> {
    const { data } = await axios.get<LighthouseReflection>(LIGHTHOUSE_URL, {
        headers: { Accept: 'application/json' },
        timeout: 10_000,
    });

    if (!data?.title || !data.content || !data.day || !DateTime.fromISO(data.day).isValid) {
        throw new Error('Unexpected response from the Lighthouse API');
    }

    return {
        title: data.title,
        text: data.content,
        imageUrl: data.featuredImage || undefined,
        day: data.day,
    };
}
