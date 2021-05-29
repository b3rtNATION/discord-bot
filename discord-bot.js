const Eris = require("eris");
require("dotenv").config();
const bot = new Eris(process.env.token, { restMode: true });

const SUPPORTROOM = "841449567790170112";
const LOBBY = "841448750564245524";

const SUPPORTROLE = "847811693252837406";
const MEMBERROLE = "841431597206863876";
const EVERYONE = "841429444647976961";
const FRIENDWITH = "841432902117490709";
const FRIENDWITHOUT = "841433371728412673";

const GUILD_ID = "841429444647976961";

const CS = {
  parent: "841462843731738635",
  overwatch: "841464217776160788",
  name: "CS:GO",
  count: 1,
};
const APEX = {
  parent: "847217713654661190",
  overwatch: "847218203158511676",
  name: "APEX",
  count: 1,
};
const COD = {
  parent: "847213945064390666",
  overwatch: "847214787356393472",
  name: "COD",
  count: 1,
};
const LOL = {
  parent: "841797724223045632",
  overwatch: "841798341112889395",
  name: "LOL",
  count: 1,
};
const RL = {
  parent: "841463201518452756",
  overwatch: "841464253331406868",
  name: "RL",
  count: 1,
};
const OTHER = {
  parent: "847466636834242581",
  overwatch: "847466932689043518",
  name: "Gamingroom",
  count: 1,
};
const GAMES = [CS, APEX, COD, LOL, RL, OTHER];
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
          contactAdmins(admin.id, member);
        }
      });
    });
  }
};

const contactAdmins = async (admin, member) => {
  const chatroom = await bot.getDMChannel(admin);
  chatroom.createMessage(`${member.username} braucht dich als Support`);
};

const moveMemberToRoom = (newChannel, member) => {
  bot.editGuildMember(GUILD_ID, member.id, { channelID: newChannel.id });
};

const createNewChannel = async (game, member) => {
  try {
    const newVoiceChannel = await bot.createChannel(
      GUILD_ID,
      `${game.name} Matchroom #${game.count}`,
      2,
      {
        parentID: game.parent,
        bitrate: 96000,
      }
    );

    const newTextChannel = await bot.createChannel(
      GUILD_ID,
      `${game.name}-matchroom-${game.count}`,
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
      text: newTextChannel.id,
      gameName: game.name,
    });
    moveMemberToRoom(newVoiceChannel, member);
    game.count++;
  } catch (err) {
    console.log(err);
  }
};

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
  if (member.roles.length === 0) {
    const dm = await bot.getDMChannel(member.id);
    dm.createMessage(
      `Hallo ${member.username} und Willkommen auf dem Discord von desiRe Gaming!\n\nWenn du uns beitreten möchtest, gibt es zwei einfache Wege:\n\n1. Am schnellsten geht es, wenn du dich in das Support Wartezimmer begibst und auf einen unserer Admins wartest.\n\n2. Sollte gerade kein Admin auf dem TS/Discord sein, kannst du uns auch über das Join-Us Formular auf unserer Website https://desiregaming.de/ kontaktieren.`
    );
  }
};

const removeChannel = (channel) => {
  bot.deleteChannel(channel.voice);
  bot.deleteChannel(channel.text);
  const channelToDeleteIndex = tempChannels.findIndex(
    (channelInArray) => channelInArray.voice === channel.voice
  );
  const gameName = tempChannels[channelToDeleteIndex].gameName;
  GAMES.find((game) => game.name === gameName).count--;

  tempChannels.splice(channelToDeleteIndex, 1);
};

bot.connect();
