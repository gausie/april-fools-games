import { ChannelType, GuildMember, TextChannel, User, userMention } from 'discord.js';
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

export async function isSacrifarseSuccessful(
  attackingTeam: string,
  defendingTeam: string,
  user: GuildMember,
): Promise<boolean> {
  const channel = await getScoresChannel();
  if (!channel) return false;

  // Update the pinned scores
  const pins = await channel.messages.fetchPinned();
  const pin = pins.at(0);
  if (!pin) return false;
  const embed = pin.embeds[0];
  if (!embed) return false;
  let defendingPoints = -1;
  let attackingPoints = -1;
  for (const field of embed.fields) {
    switch (field.name) {
      case attackingTeam: {
        const score = parseInt(field.value);
        if (score > 1) {
          attackingPoints = score - 2;
        }
        break;
      }
      case defendingTeam: {
        const score = parseInt(field.value);
        if (defendingPoints > 0) {
          defendingPoints = score - 1;
        }
        break;
      }
    }
  }
  if (attackingPoints < 0) {
    console.log(`Attacker did not have enough points to make a sacrifarse.`);
    return false;
  }
  const fields = embed.fields.map((f) => {
    switch (f.name) {
      case `${attackingTeam} ${teamSymbol(attackingTeam)}`: {
        return ({
          ...f,
          value: attackingPoints.toString(),
        });
      }
      case `${defendingTeam} ${teamSymbol(defendingTeam)}`: {
        return ({
          ...f,
          value: defendingPoints.toString(),
        });
      }
      default: {
        return f;
      }
    }
  });

  await pin.edit({
    embeds: [
      {
        ...embed,
        fields,
      },
    ],
  });
  const content = defendingPoints === -1 ?
    `${userMention(user.id)} sacrificed 2 of their own ${attackingTeam} ${teamSymbol(attackingTeam)} points but ${defendingTeam} ${teamSymbol(defendingTeam)} had no points left to deduct! 💀` :
    `${userMention(user.id)} sacrificed 2 of their own ${attackingTeam} ${teamSymbol(attackingTeam)} points to take 1 point from ${defendingTeam} ${teamSymbol(defendingTeam)}! ${teamSymbol(attackingTeam)}🔪${teamSymbol(defendingTeam)}`;

    // Post a log of the scores
  await channel.send({
    content,
    allowedMentions: { users: [] },
  });
  return true;
}

