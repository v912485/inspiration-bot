/*
 * Created Date: Wednesday July 13th 2022
 * Author: Allan Schweitz
 * -----
 * Last Modified: Thursday, 2022-07-14 17:20
 * Modified By: Allan Schweitz
 * -----
 * Copyright (c) 2022 Onepoint
 */
import { Client, Intents, CommandInteractionOptionResolver, TextChannel, Message, MessageEmbed } from 'discord.js';
import moment from 'moment';
import{ environment } from './bot-config';
import getThought, { Thought } from './commands/inspiration';
import cron from 'node-cron';

const feedUrl = "https://www.thoughtfortoday.org.uk/feed/";

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.DIRECT_MESSAGES] });

const commands = [];

client.once('ready', () => {
    console.log('Ready!');
    const channel: TextChannel = client.channels.cache.get(environment.channel) as TextChannel;

    cron.schedule('30 17 * * *', () => {
        console.log('Running once a day at 17:30');
        let thought: Thought;
        getThought().then(thought => {
            const thoughtMessage = `*Inspiration for ${moment().format('MMMM Do YYYY')}*\n>>> **${thought.topic}**\n${thought.text}`;
            channel.send(thoughtMessage);
            console.log("Image: " + thought.image);
            console.log("Topic: " + thought.topic);
            console.log("Text: " + thought.text);
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
        getThought().then(thought => {
            const thoughtMessage = `*Inspiration for ${moment().format('MMMM Do YYYY')}*\n>>> **${thought.topic}**\n${thought.text}`;
            interaction.reply(thoughtMessage);
        });
    }
});