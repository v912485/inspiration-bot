// Require the necessary discord.js classes
const { Client, Intents, CommandInteractionOptionResolver } = require('discord.js');
const { clientId, guildId, token } = require('./config.json');
const { SlashCommandBuilder } = require('@discordjs/builders');
// Create a new client instance
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.DIRECT_MESSAGES] });

const commands = [];


// When the client is ready, run this code (only once)
client.once('ready', () => {
	console.log('Ready!');
	const channel = client.channels.cache.get('988462668111298633');
	channel.send('The ToD bot has come online!');
	//channel.send('!ping');
});

client.on('messageCreate', async message => {
	if (!message.author.bot) await message.reply('echo: ' + message.content);
});

// client.on('interactionCreate', async interaction => {
	
// 	//console.log(interaction..valueOf());
// 	if (!interaction.isCommand()) return;
		
// 	const { commandName } = interaction;

// 	if (commandName === 'ping') {
// 		await interaction.reply('Pong! 123');
// 	} else if (commandName === 'server') {
// 		//await interaction.reply('Server info.');
// 		await interaction.reply(`Server name: ${interaction.guild.name}\nTotal members: ${interaction.guild.memberCount}`);
// 	} else if (commandName === 'user') {
// 		await interaction.reply(`Your tag: ${interaction.user.tag}\nYour id: ${interaction.user.id}`);
// 	}
// });

client.login(token);
