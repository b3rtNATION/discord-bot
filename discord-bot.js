const Eris = require("eris");
const bot = new Eris(process.env.TOKEN);

const SUPPORTROOM = "847721201782489098";

const ADMINS = ["718887341300908093"];

const GUILD_ID = "847170167926161469";

const CS = {
  parent: "847520199208075314",
  overwatch: "847520422824116253",
  name: "CS:GO Matchroom",
  color: "\uD83D\uDFE0",
};
const APEX = {
  parent: "847520915805044736",
  overwatch: "847522631992344626",
  name: "APEX Matchroom",
  color: "\uD83D\uDD34",
};
const COD = {
  parent: "847596655410282568",
  overwatch: "847596762994049054",
  name: "COD Matchroom",
  color: "\u26AB",
};
const LOL = {
  parent: "847596639086706698",
  overwatch: "847596738231271455",
  name: "LOL Matchroom",
  color: "\uD83D\uDFE3",
};
const RL = {
  parent: "847596705951514644",
  overwatch: "847596835081289729",
  name: "RL Matchroom",
  color: "\uD83D\uDD35",
};
const OTHER = {
  parent: "847596688998268978",
  overwatch: "847596799354077184",
  name: "Gamingroom",
  color: "\uD83D\uDFE1",
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

const checkForSupport = (channel, member) => {
  if (SUPPORTROOM === channel.id) {
    for (const admin of ADMINS) {
      contactAdmins(admin, member);
    }
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
      `${game.color} ${game.name}`,
      2,
      {
        nsfw: false,
        reason: "weil ich cool bin",
        topic: "labern",
        parentID: game.parent,
      }
    );
    tempChannels.push(newChannel.id);
    moveMemberToRoom(newChannel, member);
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
