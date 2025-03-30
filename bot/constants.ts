import { ChannelType, TextChannel, User, userMention } from "discord.js";
import { client } from "./client.js";

export const CONTAINER = "the-circass-🎪";
export const GENERAL = "general-foolery";
export const SCORES = "scores";

export const TEAMS = ["Hearts", "Diamonds", "Spades", "Clubs"];

export const teamChannelName = (team: string) => `team-${team.toLowerCase()}`;
export const teamRoleName = (team: string) => `Team ${team}`;
export const roleNameToTeam = (roleName: string) => roleName.substring(5);
export const teamSymbol = (team: string) => {
  switch (team) {
    case "Hearts":
      return "♥️";
    case "Diamonds":
      return "♦️";
    case "Spades":
      return "♠️";
    case "Clubs":
      return "♣️";
  }
  return "❓";
};

let scoresChannel: TextChannel | null = null;
async function getScoresChannel() {
  if (!scoresChannel) {
    const channel = client.guild.channels.cache.find((c) => c.name === SCORES);

    if (channel?.type == ChannelType.GuildText) {
      scoresChannel = channel;
    }
  }
  return scoresChannel;
}

export async function awardPoints(
  team: string,
  points: number,
  reason: string,
  user?: User,
) {
  const channel = await getScoresChannel();
  if (!channel) return;

  // Update the pinned scores
  const pins = await channel.messages.fetchPinned();
  const pin = pins.at(0);
  if (!pin) return;
  const embed = pin.embeds[0];
  if (!embed) return;
  const fields = embed.fields.map((f) => ({
    ...f,
    value:
      f.name === `${team} ${teamSymbol(team)}`
        ? `${parseInt(f.value) + points}`
        : f.value,
  }));
  await pin.edit({
    embeds: [
      {
        ...embed,
        fields,
      },
    ],
  });

  const content = user
    ? `${userMention(user.id)} scored ${points} points for ${team} ${teamSymbol(team)} by ${reason}`
    : `${team} ${teamSymbol(team)} scored ${points} points by ${reason}`;

  // Post a log of the scores
  await channel.send({
    content,
    allowedMentions: { users: [] },
  });
}
