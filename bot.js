// Import dependencies
require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionsBitField,
} = require("discord.js");
const { joinVoiceChannel, getVoiceConnection } = require("@discordjs/voice");
const fs = require("fs");

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
  partials: [Partials.Channel],
});

// Bot ready
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
  loadBadWords(); // Load bad words on startup
});

const CREATOR_CATEGORY_NAME = "🎸 Creator's Core"; // Feel free to change

// Handle messages
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content.startsWith("$join")) {
    const channel = message.member.voice.channel;
    if (!channel) return message.reply("Join a voice channel first!");

    try {
      joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
      });

      const textChannel = channel.guild.channels.cache.find(
        (ch) => ch.name === "💬-general-chat"
      );
      if (textChannel) {
        textChannel.send(`🚨 Bot is now monitoring **${channel.name}**.`);
      }

      message.reply(`Joined ${channel.name}! 🎵`);
    } catch (error) {
      console.error(error);
      message.reply("Failed to join the voice channel. 😞");
    }
  }

  if (message.content.startsWith("$leave")) {
    const channel = message.member.voice.channel;
    if (!channel) return message.reply("Join a voice channel first!");

    const connection = getVoiceConnection(channel.guild.id);
    if (connection) {
      connection.destroy();
      message.reply("Left the voice channel. 👋");
    } else {
      message.reply("I'm not in any voice channel!");
    }
  }

  // Register creator embed with button
  if (message.content.toLowerCase().startsWith("$registercreator")) {
    const embed = new EmbedBuilder()
      .setTitle("🎨 Creator Registration")
      .setDescription(
        "Click the button below to register as a creator and get your own private channel + role!"
      )
      .setColor("Random");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("start_creator_registration")
        .setLabel("Start Registration")
        .setStyle(ButtonStyle.Primary)
    );

    await message.reply({ embeds: [embed], components: [row] });
  }

  // ----------------------------
  // $follow @creatorname command
  // ----------------------------
  if (message.content.toLowerCase().startsWith("$follow")) {
    const mentioned = message.mentions.roles.first();
    if (!mentioned) {
      return message.reply(
        "⚠️ Please mention the creator's role. Example: `$follow @CreatorRole`"
      );
    }

    try {
      const member = await message.guild.members.fetch(message.author.id);

      if (member.roles.cache.has(mentioned.id)) {
        return message.reply("🤔 You’re already following this creator!");
      }

      await member.roles.add(mentioned);
      message.reply(
        `✅ You’re now following **${mentioned.name}**! You can view their channel now.`
      );
    } catch (err) {
      console.error("Follow error:", err);
      message.reply(
        "❌ Something went wrong while trying to follow. Please try again."
      );
    }
  }

  // -------------------------------
  // $unfollow @creatorname command
  // -------------------------------
  if (message.content.toLowerCase().startsWith("$unfollow")) {
    const mentioned = message.mentions.roles.first();
    if (!mentioned) {
      return message.reply(
        "⚠️ Please mention the creator's role. Example: `$unfollow @CreatorRole`"
      );
    }

    try {
      const member = await message.guild.members.fetch(message.author.id);

      if (!member.roles.cache.has(mentioned.id)) {
        return message.reply("🤷‍♂️ You're not following this creator yet.");
      }

      await member.roles.remove(mentioned);
      message.reply(
        `🚫 You've unfollowed **${mentioned.name}**. You won't see their channel anymore.`
      );
    } catch (err) {
      console.error("Unfollow error:", err);
      message.reply("❌ Failed to unfollow. Try again later.");
    }
  }

  // // Custom responses
  // const customResponses = {
  //   hi: "Hello There! 🎉",
  //   hello: "Hey! Glad to have you here. 😊",
  //   help: "Sure! Let me know how I can assist you. 🤖",
  //   bye: "Goodbye! Hope to see you again soon. 👋",
  //   "good afternoon": "Good Afternoon to you too! 🌞",
  //   "good morning": "Good Morning! Have a great day. 🌅",
  //   "good night": "Good Night! Sweet dreams. 🌙",
  // };

  // const messageContent = message.content.toLowerCase();

  // for (const key in customResponses) {
  //   if (messageContent.includes(key)) {
  //     message.reply(customResponses[key]);
  //     break;
  //   }
  // }
});

// Handle interaction events (buttons & modals)
client.on("interactionCreate", async (interaction) => {
  if (
    interaction.isButton() &&
    interaction.customId === "start_creator_registration"
  ) {
    const modal = new ModalBuilder()
      .setCustomId("creator_registration_modal")
      .setTitle("Register as Creator");

    const creatorNameInput = new TextInputBuilder()
      .setCustomId("creatorName")
      .setLabel("Creator Name")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const contentTypeInput = new TextInputBuilder()
      .setCustomId("contentType")
      .setLabel("Content Type (e.g., Gaming, Art, Music)")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const bioInput = new TextInputBuilder()
      .setCustomId("bio")
      .setLabel("Short Bio")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const row1 = new ActionRowBuilder().addComponents(creatorNameInput);
    const row2 = new ActionRowBuilder().addComponents(contentTypeInput);
    const row3 = new ActionRowBuilder().addComponents(bioInput);

    modal.addComponents(row1, row2, row3);
    await interaction.showModal(modal);
  }

  // Handle modal submission
  if (
    interaction.isModalSubmit() &&
    interaction.customId === "creator_registration_modal"
  ) {
    const creatorName = interaction.fields.getTextInputValue("creatorName");
    const contentType = interaction.fields.getTextInputValue("contentType");
    const bio = interaction.fields.getTextInputValue("bio");

    try {
      const guild = interaction.guild;
      const member = await guild.members.fetch(interaction.user.id);

      // Create Role
      const role = await guild.roles.create({
        name: creatorName,
        color: "Random",
        reason: "New Creator Registered",
        mentionable: true, // ✅ So users can follow and mention it
      });

      let category = guild.channels.cache.find(
        (c) => c.name === CREATOR_CATEGORY_NAME && c.type === 4
      );

      await member.roles.add(role);

      // Create private channel
      const channelName = `${creatorName
        .toLowerCase()
        .replace(/\s+/g, "-")}-zone`;

      await guild.channels.create({
        name: channelName,
        type: 0, // GUILD_TEXT
        parent: category.id, // 👈 This assigns it to the category
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id, // 🛠️ Deny @everyone
            deny: [PermissionsBitField.Flags.ViewChannel],
          },
          {
            id: role.id, // 🛠️ Allow creator's role
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory,
            ],
          },
          {
            id: interaction.user.id, // 🛠️ Allow the user directly
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory,
            ],
          },
        ],
      });

      await interaction.reply({
        content: `✅ You're now registered as a creator!\n**Role:** ${role}\n**Channel:** #${channelName}`,
        ephemeral: true,
      });
    } catch (err) {
      console.error("Error in creator registration:", err);
      await interaction.reply({
        content:
          "❌ Something went wrong while registering. Please try again later.",
        ephemeral: true,
      });
    }
  }
});

// Login
client.login(process.env.DISCORD_TOKEN);
