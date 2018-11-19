const Discord = require('discord.js');
const client = new Discord.Client();

import discordIRC from 'discord-irc';
import config from './config.json';
discordIRC(config);


client.on('ready', () => {
    console.log('I am ready!');
});



client.on('message', message => {
    if (message.content === 'bing') {
    	message.reply('BONG!');
  	}
});

// THIS  MUST  BE  THIS  WAY
client.login(process.env.BOT_TOKEN);



