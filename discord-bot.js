const Eris = require("eris");
require("dotenv").config();
const bot = new Eris(process.env.token, { restMode: true });

const SUPPORTROOM = "841449567790170112";

const SUPPORTROLE = "847811693252837406"

const GUILD_ID = "841429444647976961";

const CS = {
  parent: "841462843731738635",
  overwatch: "841464217776160788",
  name: "CS:GO Matchroom",
};
const APEX = {
  parent: "847217713654661190",
  overwatch: "847218203158511676",
  name: "APEX Matchroom",
};
const COD = {
  parent: "847213945064390666",
  overwatch: "847214787356393472",
  name: "COD Matchroom",
};
const LOL = {
  parent: "841797724223045632",
  overwatch: "841798341112889395",
  name: "LOL Matchroom",
};
const RL = {
  parent: "841463201518452756",
  overwatch: "841464253331406868",
  name: "RL Matchroom",
};
const OTHER = {
  parent: "847466636834242581",
  overwatch: "847466932689043518",
  name: "Gamingroom",
};
const GAMES = [CS, APEX, COD, LOL, RL, OTHER];
const tempChannels = [];

bot.on("voiceChannelSwitch", (member, newChannel, oldChannel) => {
  checkForChannelRequest(newChannel, member);
  checkMemberCountInTempChannel();
  checkForSupport(newChannel, member);
});

bot.on("voiceChannelJoin", (member, newChannel) => {
  checkForChannelRequest(newChannel, member);
  checkForSupport(newChannel, member);
});

bot.on("voiceChannelLeave", (member, oldChannel) => {
  checkMemberCountInTempChannel();
});

const checkForChannelRequest = (channel, member) => {
  for (const game of GAMES) {
    if (channel.id === game.overwatch) {
      createNewChannel(game, member);
    }
  }
};

const checkForSupport = async (channel, member) => {
  if (SUPPORTROOM === channel.id) {
    const guilds = bot.guilds;
    guilds.forEach((guild) => {
      guild.members.forEach((admin) => {
        if (admin.roles.includes(SUPPORTROLE)) {
          contactAdmins(admin.id, member)
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
    const newChannel = await bot.createChannel(
      GUILD_ID,
      `${game.name}`,
      2,
      {
        nsfw: false,
        reason: "new channel needed",
        topic: "ingame talk",
        parentID: game.parent,
        bitrate: 96000
      }
    );
    tempChannels.push(newChannel.id);
    moveMemberToRoom(newChannel, member);
    console.log(newChannel);
  } catch (err) {
    console.log(err);
  }
};

const checkMemberCountInTempChannel = () => {
  for (const channel of tempChannels) {
    const members = bot.getChannel(channel).voiceMembers;
    if (members.size === 0) {
      removeChannel(channel);
    }
  }
};

const removeChannel = (channel) => {
  bot.deleteChannel(channel);
  const channelToDeleteIndex = tempChannels.findIndex(
    (channelInArray) => channelInArray === channel
  );
  tempChannels.splice(channelToDeleteIndex, 1);
};

bot.connect();
