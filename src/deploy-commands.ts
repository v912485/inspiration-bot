/*
 * Created Date: Wednesday July 13th 2022
 * Author: Allan Schweitz
 * -----
 * Last Modified: Thursday, 2022-07-14 17:10
 * Modified By: Allan Schweitz
 * -----
 * Copyright (c) 2022 Onepoint
 */

const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
//const { clientId, guildId, token } = require('./config.json');
import{ environment } from './bot-config';

const commands = [
    new SlashCommandBuilder().setName('inspiration').setDescription('Replies with an inspiration for the day!'),
    //new SlashCommandBuilder().setName('server').setDescription('Replies with server info!'),
    //new SlashCommandBuilder().setName('user').setDescription('Replies with user info!'),
].map(command => command.toJSON());

const rest = new REST({ version: '9' }).setToken(environment.token);

rest.put(Routes.applicationGuildCommands(environment.clientId, environment.guildId), { body: commands })
    .then(() => console.log('Successfully registered application commands.'))
    .catch(console.error);