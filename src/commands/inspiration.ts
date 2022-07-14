/*
 * Created Date: Wednesday July 13th 2022
 * Author: Allan Schweitz
 * -----
 * Last Modified: Thursday, 2022-07-14 14:42
 * Modified By: Allan Schweitz
 * -----
 * Copyright (c) 2022 Onepoint
 */
import axios from 'axios';

export interface Thought {
    topic: string
    text: string
    image: string
    date: Date
    language: string
}

export default async (): Promise<Thought> => {

    const { data, status } = await axios.get<Thought>(
        'http://thoughts.brahmakumaris.org/thoughts/thought/totd?orgIds=111&lang=en&dateFormat=ISO8601&specificDay=true',
        {
          headers: {
            Accept: 'application/json',
          },
        },
      );
      //console.log(JSON.stringify(data));
      return data;
};
/*
export async function rssThoughts (url: string): Promise<void> {
    const feed = new RSSParser().parseURL(url);
    
    console.log((await feed).title);

    (await feed).items.forEach((item) => {
        console.log(`${item.title} - ${item.link}\n${item.content}\n\n`);
    });
}*/