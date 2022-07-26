/*
 * Created Date: Wednesday July 13th 2022
 * Author: Allan Schweitz
 * -----
 * Last Modified: Tuesday, 2022-07-26 7:55
 * Modified By: Allan Schweitz
 * -----
 * Copyright (c) 2022 Onepoint
 */
import { Client, Intents, TextChannel, MessageEmbed } from 'discord.js';
import { environment } from './bot-config';
import { getRssThought, Thought } from './commands/inspiration';
import cron from 'node-cron';
import { DateTime as dateTime} from 'luxon';

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.DIRECT_MESSAGES] });

client.once('ready', () => {
    console.log('Ready!');
    const channel: TextChannel = client.channels.cache.get(environment.channel) as TextChannel;
    let lastDate: string = dateTime.now().toISODate(); //moment().format('YYYY-MM-DD');

    cron.schedule('*/30 6-12 * * *', () => {
        console.log('Running at ' + dateTime.now().toLocaleString(dateTime.DATETIME_SHORT));
        getRssThought().then(thought => {
            let thoughtDate = dateTime.fromJSDate(thought.date).toISODate();
            if (thoughtDate !== lastDate) {
                const thoughtMessage = `*Inspiration for ${dateTime.fromJSDate(thought.date).toLocaleString(dateTime.DATE_FULL)}*`;
                console.log('Sending message');
                const embedMessage = new MessageEmbed()
                    .setColor('#02bfbf')
                    .setTitle(thought.topic)
                    .setImage(thought.image)
                    .setDescription(thought.text);
                channel.send({ content: thoughtMessage, embeds: [embedMessage] });
                lastDate = thoughtDate;
            }
        });
    });
});

client.login(environment.token);

//client.on('messageCreate', async (message) => {
//    if (!message.author.bot) await message.reply('echo: ' + message.content);
//});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'inspiration') {
        getRssThought().then(thought => {
            const thoughtMessage = `*Inspiration for ${dateTime.fromJSDate(thought.date).toLocaleString(dateTime.DATE_FULL)}*`;
            console.log('Sending message');
            const embedMessage = new MessageEmbed()
                .setColor('#02bfbf')
                .setTitle(thought.topic)
                .setImage(thought.image)
                .setDescription(thought.text)
            //setThumbnail(thought.image);
            interaction.reply({ content: thoughtMessage, embeds: [embedMessage] });
        });
    }
});