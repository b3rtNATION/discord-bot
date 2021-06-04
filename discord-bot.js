const Eris = require("eris");
require("dotenv").config();
const bot = new Eris(process.env.token, { restMode: true });

const SUPPORTROOM = "841449567790170112";
const ROB = "718887341300908093"

const SUPPORTROLE = "847811693252837406";
const MEMBERROLE = "841431597206863876";
const EVERYONE = "841429444647976961";
const FRIENDWITH = "841432902117490709";
const FRIENDWITHOUT = "841433371728412673";

const GUILD_ID = "841429444647976961";
const TALK = {
  parent: "841459514116014100",
  overwatch: "847805213096149012",
  channelCount: 3,
};
const CS = {
  parent: "841462843731738635",
  overwatch: "841464217776160788",
  channelCount: 2,
};
const APEX = {
  parent: "847217713654661190",
  overwatch: "847218203158511676",
  channelCount: 2,
};
const COD = {
  parent: "847213945064390666",
  overwatch: "847214787356393472",
  channelCount: 2,
};
const LOL = {
  parent: "841797724223045632",
  overwatch: "841798341112889395",
  channelCount: 2,
};
const RL = {
  parent: "841463201518452756",
  overwatch: "841464253331406868",
  channelCount: 2,
};
const OTHER = {
  parent: "847466636834242581",
  overwatch: "847466932689043518",
  channelCount: 1,
};
const GAMES = [CS, APEX, COD, LOL, RL, OTHER, TALK];
const tempChannels = [];

// ------------- E V E N T S -------------

bot.on("voiceChannelSwitch", (member, newChannel, oldChannel) => {
  checkForChannelRequest(newChannel, member);
  checkMemberCountInTempChannel();
  checkForSupport(newChannel, member);
  handleChannelPermission(newChannel, member, "join");
});

bot.on("voiceChannelJoin", (member, newChannel) => {
  checkForChannelRequest(newChannel, member);
  checkForSupport(newChannel, member);
  handleChannelPermission(newChannel, member, "join");
});

bot.on("voiceChannelLeave", (member, oldChannel) => {
  checkMemberCountInTempChannel();
  handleChannelPermission(oldChannel, member, "leave");
});

bot.on("guildMemberAdd", (guild, member) => {
  handleNewUser(member);
});

bot.on("messageCreate", (msg) => {
  handleMaxUserRequest(msg);
});

// ------------- L O G I C -------------

const checkForChannelRequest = (channel, member) => {
  for (const game of GAMES) {
    if (channel.id === game.overwatch) {
      createNewChannel(game, member);
    }
  }
};

const checkForSupport = (channel, member) => {
  if (SUPPORTROOM === channel.id) {
    const guilds = bot.guilds;
    guilds.forEach((guild) => {
      guild.members.forEach((admin) => {
        if (admin.roles.includes(SUPPORTROLE)) {
          if (
            admin.clientStatus.web === "offline" &&
            admin.clientStatus.desktop === "offline" &&
            admin.clientStatus.mobile === "offline"
          )
            return;
          contactAdmins(admin.id, member);
        }
      });
    });
  }
};

const contactAdmins = async (admin, member) => {
  try {
    const chatroom = await bot.getDMChannel(admin);
    chatroom.createMessage(`${member.username} braucht dich als Support`);
  } catch (err) {
    sendErrorMessage(err)
  }
  
};

const sendErrorMessage = (msg) => {
  bot.getDMChannel(ROB).createMessage(msg)
}

const moveMemberToRoom = (newChannel, member) => {
  bot.editGuildMember(GUILD_ID, member.id, { channelID: newChannel.id });
};

const createNewChannel = async (game, member) => {
  const roomNumber = getRoomNumber(game);
  try {
    const newVoiceChannel = await bot.createChannel(
      GUILD_ID,
      `Raum ${roomNumber}`,
      2,
      {
        parentID: game.parent,
        bitrate: 96000,
      }
    );

    const newTextChannel = await bot.createChannel(
      GUILD_ID,
      `Raum ${roomNumber}`,
      0,
      {
        parentID: game.parent,
        permissionOverwrites: [
          { deny: 8589934591, id: MEMBERROLE, type: "role" },
          { deny: 8589934591, id: EVERYONE, type: "role" },
          { deny: 8589934591, id: FRIENDWITH, type: "role" },
          { deny: 8589934591, id: FRIENDWITHOUT, type: "role" },
        ],
      }
    );
    tempChannels.push({
      voice: newVoiceChannel.id,
      voiceName: newVoiceChannel.name,
      text: newTextChannel.id,
      gameName: game.name,
      owner: member.id,
    });
    moveMemberToRoom(newVoiceChannel, member);
  } catch (err) {
    sendErrorMessage(err)
  }
};

const getRoomNumber = (game) => {
  const category = bot.getChannel(game.parent)
  if (category.channels.size === 1) return 1
  if (category.channels.size % 2 === 0) {
    return category.channels.size - (category.channels.size / 2)
  }
  return category.channels.size - ((category.channels.size - 1) / 2) - 1
}

const handleChannelName = () => {
  tempChannels.forEach(async (channel, index) => {
    try {
      if (!channel.voiceName.includes(index.toString())) {
        const voiceChannel = bot.getChannel(channel.voice)
        const textChannel = bot.getChannel(channel.text)
        if (voiceChannel.name.toLowerCase().includes('max')) {
          const userLimit = voiceChannel.userLimit
          await voiceChannel.edit({ name: `Raum ${index + 1} MAX${userLimit}`})
        } else {
          await voiceChannel.edit({ name: `Raum ${index + 1}`})
        }
        await textChannel.edit({ name: `Raum ${index + 1}`})
      }
    } catch (err) {
      sendErrorMessage (err)
    }
  })
}

const checkMemberCountInTempChannel = () => {
  for (const channel of tempChannels) {
    const members = bot.getChannel(channel.voice).voiceMembers;
    if (members.size === 0) {
      removeChannel(channel);
    }
  }
};

const handleChannelPermission = (channel, member, type) => {
  if (type === "join") {
    for (const room of tempChannels) {
      if (room.voice === channel.id) {
        bot
          .getChannel(room.text)
          .editPermission(member.id, 2953313361, 8, "member");
      }
    }
  } else {
    for (const room of tempChannels) {
      if (room.voice === channel.id) {
        bot
          .getChannel(room.text)
          .editPermission(member.id, 1, 8589934591, "member");
      }
    }
  }
};

const handleNewUser = async (member) => {
  try {
    if (member.roles.length === 0) {
      const dm = await bot.getDMChannel(member.id);
      dm.createMessage(
        `Hallo ${member.username} und Willkommen auf dem Discord von desiRe Gaming!\n\nFalls Du hier neu bist, komm doch einfach mal in das Support Wartezimmer. Unsere Supporter sind schnellstmöglich für dich da!`
      );
    }
  } catch (err) {
    sendErrorMessage(err)
  }
};

const handleMaxUserRequest = (msg) => {
  for (const channel of tempChannels) {
    if (
      channel.text === msg.channel.id &&
      msg.author.id === channel.owner &&
      msg.content.toLowerCase().startsWith("max")
    ) {
      const maxUser = msg.content.substring(3, msg.content.lenth);
      renameChannel(channel, maxUser)
    }
  }
};

const renameChannel = (channel, maxUser) => {
  if (maxUser === '0') {
    bot.getChannel(channel.voice).edit({
      name: `${channel.voiceName}`,
      userLimit: maxUser,
    });
  } else {
    bot.getChannel(channel.voice).edit({
      name: `${channel.voiceName} MAX${maxUser}`,
      userLimit: maxUser,
    });
  }
}

const removeChannel = async (channel) => {
  try {
    await bot.deleteChannel(channel.voice);
    await bot.deleteChannel(channel.text);
  } catch (err) {
    sendErrorMessage(err)
  }
  
  const channelToDeleteIndex = tempChannels.findIndex(
    (channelInArray) => channelInArray.voice === channel.voice
  );
  tempChannels.splice(channelToDeleteIndex, 1);
  setTimeout(() => {
    handleChannelName();
  }, 500);
};

bot.connect();
