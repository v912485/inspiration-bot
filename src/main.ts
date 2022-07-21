/*
 * Created Date: Wednesday July 13th 2022
 * Author: Allan Schweitz
 * -----
 * Last Modified: Thursday, 2022-07-21 11:49
 * Modified By: Allan Schweitz
 * -----
 * Copyright (c) 2022 Onepoint
 */
import { Client, Intents, TextChannel, MessageEmbed } from 'discord.js';
import moment from 'moment';
import { environment } from './bot-config';
import { getRssThought, Thought } from './commands/inspiration';
import cron from 'node-cron';

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.DIRECT_MESSAGES] });

client.once('ready', () => {
    console.log('Ready!');
    const channel: TextChannel = client.channels.cache.get(environment.channel) as TextChannel;

    cron.schedule('0 6 * * *', () => {
        console.log('Running once a day at 06:00');
        let thought: Thought;
        getRssThought().then(thought => {
            const thoughtMessage = `*Inspiration for ${moment().format('MMMM Do YYYY')}*`;
            console.log('Sending message');
            const embedMessage = new MessageEmbed()
                .setColor('#02bfbf')
                .setTitle(thought.topic)
                .setImage(thought.image)
                .setDescription(thought.text)
            //setThumbnail(thought.image);
            channel.send({ content: thoughtMessage, embeds: [embedMessage] });
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
            const thoughtMessage = `*Inspiration for ${moment().format('MMMM Do YYYY')}*`;
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