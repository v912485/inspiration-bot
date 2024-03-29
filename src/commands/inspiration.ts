/*
 * Created Date: Wednesday July 13th 2022
 * Author: Allan Schweitz
 * -----
 * Last Modified: Saturday, 2022-08-20 10:24
 * Modified By: Allan Schweitz
 * -----
 * Copyright (c) 2022 Onepoint
 */
import axios from 'axios';
import Parser from 'rss-parser';
import { JSDOM } from 'jsdom';

export interface Thought {
    topic: string
    text: string
    image: string
    date: Date
    language: string
}
/*
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
};*/

export default async (): Promise<Thought> => {

    const { data, status } = await axios.get<any>(
        'https://admin.thelighthouse.world/lighthouse/reflectionOfToday',
        {
          headers: {
            Accept: 'application/json',
          },
        },
      );
      //console.log(JSON.stringify(data));
      return { topic: data.title, image: data.featuredImage, text: data.content, date: new Date(data.day), language: data.language } as Thought;
};

export async function getRssThought(): Promise<Thought> {
    let parser = new Parser();
    const thought = parser.parseURL('https://www.thoughtfortoday.org.uk/feed/atom').then(resp => {

        const dom = new JSDOM(resp.items[0].content);
        const images = dom.window.document.getElementsByTagName('img');
        const paragraphs = dom.window.document.getElementsByTagName('p');
        console.log(resp.items[0].title);
        let txt = '';
        let i = 0;
        for (let p of paragraphs) {
            console.log(' ' + p.textContent);
            txt += "\n\n" + p.textContent;
        }
        return { topic: resp.items[0].title, image: images[0].src, text: txt, date: new Date(resp.items[0].isoDate!), language: 'en' } as Thought;
    });
    return thought;
}