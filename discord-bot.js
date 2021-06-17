const Eris = require("eris");
const fs = require("fs");
require("dotenv").config();
const bot = new Eris(process.env.token, { restMode: true });

const GUILD_ID = "841429444647976961";

const SASU = "360508102560448512";

const SUPPORT_CHANNEL_ID = "841449567790170112";
const SUPPORT_ROLE_ID = "847811693252837406";

const MEMBER_ROLE_ID = "841431597206863876";
const EVERYONE_ROLE_ID = "841429444647976961";
const FRIEND_WITH_ROLE_ID = "841432902117490709";
const FRIEND_WITHOUT_ROLE_ID = "841433371728412673";

const CS = "841462843731738635";
const RL = "841463201518452756";
const APEX = "847217713654661190";
const COD = "847213945064390666";
const LOL = "841797724223045632";
const OTHER = "847466636834242581";
const TALK = "841459514116014100";

const PARENT_CHANNEL_IDS = [CS, RL, APEX, COD, LOL, OTHER, TALK];
const GREEK_LETTERS = ["α", "β", "γ", "λ", "π", "δ", "ε", "η", "φ", "ω", "ξ", "μ", "ρ", "σ"];

// ------------- E V E N T S -------------

bot.on("voiceChannelSwitch", (member, newChannel, oldChannel) => {
  handleUserMovement("switch", newChannel, oldChannel, member);
  handleSupportRequest(newChannel, member);
});

bot.on("voiceChannelJoin", (member, newChannel) => {
  handleUserMovement("join", newChannel, null, member);
  handleSupportRequest(newChannel, member);
});

bot.on("voiceChannelLeave", (member, oldChannel) => {
  handleUserMovement("leave", null, oldChannel, member);
});

bot.on("messageCreate", (messageObject) => {
  handleChat(messageObject);
});

// ------------- L O G I C -------------

const handleUserMovement = (type, joinedChannel, leftChannel, member) => {
  switch (type) {
    case "join":
      handleUserJoinedChannel(joinedChannel, member);
      break;
    case "leave":
      handleUserLeftChannel(leftChannel, member);
      break;
    case "switch":
      handleUserSwitchedChannel(joinedChannel, leftChannel, member);
      break;
  }
};

const handleUserJoinedChannel = (joinedChannel, member) => {
  if (isOverwatchedChannel(joinedChannel)) {
    const parentChannel = getParentChannel(joinedChannel);
    const allChannelsAreFull = checkIfAllChannelsAreFull(parentChannel);
    if (allChannelsAreFull) {
      createNewChannelPair(parentChannel);
    }
    manageChannelPermission(member, joinedChannel);
  }
};

const handleUserSwitchedChannel = (joinedChannel, leftChannel, member) => {
  if (joinedChannel) {
    isOverwatchedChannel(joinedChannel) &&
      handleUserJoinedChannel(joinedChannel, member);
  }
  if (leftChannel) {
    isOverwatchedChannel(leftChannel) &&
      handleUserLeftChannel(leftChannel, member);
  }
};

const handleUserLeftChannel = (leftChannel, member) => {
  const channelIsEmpty = isChannelEmpty(leftChannel);
  const remainingChannel = getRemaingEmptyVoiceChannel(leftChannel);
  if (
    channelIsEmpty &&
    remainingChannel > 1 &&
    isOverwatchedChannel(leftChannel)
  ) {
    deleteChannelPair(leftChannel);
  } else {
    manageChannelPermission(member, null, leftChannel);
  }
};

const handleSupportRequest = (joinedChannel, member) => {
  if (joinedChannel.id === SUPPORT_CHANNEL_ID) {
    contactAdmins(member);
  }
};

const handleChat = (messageObject) => {
  const message = messageObject.content.toLowerCase();
  if (message.includes("max") && message.length < 6) {
    setChannelUserLimit(messageObject);
  }
};

const isOverwatchedChannel = (channel) => {
  return PARENT_CHANNEL_IDS.includes(channel.parentID);
};

const checkIfAllChannelsAreFull = (parentChannel) => {
  let allChannelsAreFull = true;
  parentChannel.channels.forEach((channel) => {
    if (channel.type === 2) {
      if (channel.voiceMembers.size === 0) {
        allChannelsAreFull = false;
      }
    }
  });
  return allChannelsAreFull;
};

const getParentChannel = (channel) => {
  return bot.getChannel(channel.parentID);
};

const createNewChannelPair = async (parentChannel) => {
  const channelName = getChannelName(parentChannel);
  await bot.createChannel(GUILD_ID, channelName, 2, {
    parentID: parentChannel.id,
  });

  await bot.createChannel(GUILD_ID, channelName, 0, {
    parentID: parentChannel.id,
    permissionOverwrites: [
      { deny: 8589934591, id: EVERYONE_ROLE_ID, type: "role" },
      { deny: 8589934591, id: MEMBER_ROLE_ID, type: "role" },
      { deny: 8589934591, id: FRIEND_WITHOUT_ROLE_ID, type: "role" },
      { deny: 8589934591, id: FRIEND_WITH_ROLE_ID, type: "role" },
    ],
  });
};

const getChannelName = (parentChannel) => {
  let isUniqueLetter = false;
  let randomGreekLetter = "";
  while (!isUniqueLetter) {
    randomGreekLetter =
      GREEK_LETTERS[Math.floor(Math.random() * GREEK_LETTERS.length)];
    isUniqueLetter = testForUniqueLetter(parentChannel, randomGreekLetter);
  }
  return `Raum ${randomGreekLetter}`;
};

const testForUniqueLetter = (parentChannel, letter) => {
  let isUniqureLetter = true;
  parentChannel.channels.forEach((channel) => {
    if (channel.name.includes(letter)) {
      isUniqureLetter = false;
    }
  });
  return isUniqureLetter;
};

const getRemaingEmptyVoiceChannel = (leftChannel) => {
  const parentChannel = getParentChannel(leftChannel);
  let remainingChannel = 0;
  parentChannel.channels.forEach((channel) => {
    if (channel.type === 2 && channel.voiceMembers.size === 0) {
      remainingChannel++;
    }
  });
  return remainingChannel;
};

const isChannelEmpty = (leftChannel) => {
  return leftChannel.voiceMembers.size === 0 ? true : false;
};

const deleteChannelPair = (leftChannel) => {
  const channelIdentifier = getChannelIdentifier(leftChannel);
  const parentChannel = getParentChannel(leftChannel);
  parentChannel.channels.forEach(async (channel) => {
    if (channel.name.includes(channelIdentifier)) {
      await bot.deleteChannel(channel.id);
    }
  });
};

const getChannelIdentifier = (channel) => {
  return channel.name.substring(5, channel.name.length);
};

const getMatchingTextChannel = (channel, channelIdentifier) => {
  return new Promise((res, rej) => {
    const channels = getParentChannel(channel).channels;
    channels.forEach((channel) => {
      if (channel.type === 0 && channel.name.includes(channelIdentifier)) {
        res(channel);
      }
    });
  });
};

const getMatchingVoiceChannel = (channel, channelIdentifier) => {
  return new Promise((res, rej) => {
    const channels = getParentChannel(channel).channels;
    channels.forEach((channel) => {
      if (channel.type === 2 && channel.name.includes(channelIdentifier)) {
        res(channel);
      }
    });
  });
};

const manageChannelPermission = (member, joinedChannel, leftChannel) => {
  joinedChannel && addPermission(joinedChannel, member);
  leftChannel && removePermission(leftChannel, member);
};

const addPermission = async (channel, member) => {
  const channelIdentifier = getChannelIdentifier(channel);
  const textChannel = await getMatchingTextChannel(channel, channelIdentifier);
  await textChannel.editPermission(member.id, 2953313361, 8, "member");
};

const removePermission = async (channel, member) => {
  const channelIdentifier = getChannelIdentifier(channel);
  const textChannel = await getMatchingTextChannel(channel, channelIdentifier);
  await textChannel.editPermission(member.id, 1, 8589934591, "member");
};

const setChannelUserLimit = async (messageObject) => {
  const channelIdentifier = getChannelIdentifier(messageObject.channel);
  const voiceChannel = await getMatchingVoiceChannel(
    messageObject.channel,
    channelIdentifier
  );
  const userLimit = getUserLimit(messageObject.content);
  await voiceChannel.edit({ userLimit });
};

const getUserLimit = (message) => {
  const userLimit = message.substring(3, message.length);
  if (isNaN(userLimit)) return "0";
  return userLimit;
};

const contactAdmins = (member) => {
  const admins = getAdmins();
  admins.forEach((admin) => {
    if (adminIsOnline(admin) || admin.id === SASU) {
      sendSupportMessage(admin, member);
    }
  });
};

const getAdmins = () => {
  const admins = [];
  const guilds = bot.guilds;
  guilds.forEach((guild) => {
    guild.members.forEach((member) => {
      member.roles.forEach(role => {
        if (role === SUPPORT_ROLE_ID) {
          admins.push(member)
        }
      })
    });
  });
  return admins;
};

const adminIsOnline = (admin) => {
  if (
    admin.status === "offline" &&
    admin.status === "offline"
  ) {
    return false;
  } else {
    return true;
  }
};

const sendSupportMessage = async (admin, member) => {
  const chatroom = await bot.getDMChannel(admin.id);
  chatroom.createMessage(`${member.username} braucht dich als Support`);
};

bot.connect();
