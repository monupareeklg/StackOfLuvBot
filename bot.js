// Import dependencies
require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
} = require("@discordjs/voice");
const fs = require("fs");
const playdl = require("play-dl");

let badWords = [];

// Load bad words into the array when the bot starts
const loadBadWords = () => {
  try {
    const data = fs.readFileSync("badwords.txt", "utf8");
    badWords = data.split("\n").map((word) => word.trim().toLowerCase());
    console.log("Bad words loaded:", badWords);
  } catch (err) {
    console.error("Error reading badwords.txt:", err);
  }
};

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Event: Bot is ready
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
  loadBadWords(); // Load bad words on bot startup
});

// Event: Message received
client.on("messageCreate", async (message) => {
  // Ignore bot messages
  if (message.author.bot) return;

  if (message.content.startsWith("$join")) {
    const channel = message.member.voice.channel;

    if (!channel) {
      return message.reply(
        "You need to be in a voice channel to use this command!"
      );
    }

    try {
      // Join the voice channel
      joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
      });

      // Notify the text channel
      const textChannel = channel.guild.channels.cache.find(
        (ch) => ch.name === "💬-general-chat" // Replace with your target text channel
      );

      if (textChannel) {
        textChannel.send(
          `🚨 Moderation alert: Bot is now monitoring **${channel.name}**.`
        );
      }

      message.reply(`Joined ${channel.name}! 🎵`);
    } catch (error) {
      console.error(error);
      message.reply("Failed to join the voice channel. 😞");
    }
  }

  if (message.content.startsWith("$play")) {
    const args = message.content.split(" ");
    const url = args[1];

    if (!url || !(await playdl.validate(url))) {
      return message.reply("Please provide a valid YouTube URL!");
    }

    const channel = message.member.voice.channel;
    if (!channel) {
      return message.reply("You need to be in a voice channel to play music!");
    }

    try {
      const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
      });

      const stream = await playdl.stream(url); // Fetch audio stream
      console.log("Stream created:", stream);
      const resource = createAudioResource(stream.stream, {
        inputType: stream.type, // Stream type is required by play-dl
      });
      console.log("Audio resource created:", resource);

      const player = createAudioPlayer();
      connection.subscribe(player);
      player.play(resource);

      message.reply(`Now playing: ${url}`);

      player.on(AudioPlayerStatus.Playing, () => {
        console.log("Audio player is playing!");
      });

      player.on(AudioPlayerStatus.Idle, () => {
        console.log("Audio player is idle, disconnecting...");
        connection.destroy();
      });

      player.on("error", (error) => {
        console.error("Audio Player Error:", error);
      });
    } catch (error) {
      console.error("Error playing music:", error);
      message.reply("Failed to play music. 😞");
    }
  }

  if (message.content.startsWith("$leave")) {
    const channel = message.member.voice.channel;

    if (!channel) {
      return message.reply(
        "You need to be in a voice channel to use this command!"
      );
    }

    const connection = getVoiceConnection(channel.guild.id);
    if (connection) {
      connection.destroy();
      message.reply("Left the voice channel. 👋");
    } else {
      message.reply("I'm not in any voice channel!");
    }
  }

  // Check if the message has attachments (e.g., images, files)
  if (message.attachments.size > 0) {
    return; // Skip processing if the message contains attachments
  }

  // Custom responses based on the message content
  const customResponses = {
    hi: "Hello There! 🎉",
    hello: "Hey! Glad to have you here. 😊",
    help: "Sure! Let me know how I can assist you. 🤖",
    bye: "Goodbye! Hope to see you again soon. 👋",
    "good afternoon": "Good Afternoon to you too! 🌞",
    "good morning": "Good Morning! Have a great day. 🌅",
    "good night": "Good Night! Sweet dreams. 🌙",
  };

  // Convert the message to lowercase for case-insensitive matching
  const messageContent = message.content.toLowerCase();

  // Check if the message contains any key in customResponses
  for (const key in customResponses) {
    if (messageContent.includes(key)) {
      // Send the corresponding custom response
      message.reply(customResponses[key]);
      break; // Stop after finding the first match
    }
  }
});

// Log in to Discord with your bot token
client.login(process.env.DISCORD_TOKEN);
