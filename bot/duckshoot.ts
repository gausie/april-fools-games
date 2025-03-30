import {
  channelMention,
  DiscordAPIError,
  Events,
  Message,
  PermissionsBitField,
} from "discord.js";
import { client } from "./client.js";
import { awardPoints, roleNameToTeam } from "./constants.js";

async function getPossibleChannels() {
  const channels = await client.guild.channels.fetch();
  return [...channels.values()]
    .filter((c) => c !== null)
    .filter((c) => c.isSendable() && c.isTextBased())
    .filter((c) => {
      const permissions = c.permissionsFor(client.guild.roles.everyone);
      return (
        permissions.has(PermissionsBitField.Flags.ViewChannel) &&
        permissions.has(PermissionsBitField.Flags.SendMessages)
      );
    });
}

async function postTarget() {
  const channels = await getPossibleChannels();
  const channel = channels[Math.floor(Math.random() * channels.length)];
  const target = Math.random() < 0.1 ? "🦆" : "🎯";
  console.log(`[DUCKSHOOT] Posted ${target} in ${channel.name}`);
  return await channel.send(target);
}

function isTargetMessage(message: Message<boolean>) {
  if (message.author.id !== client.user?.id) return false;
  if (!["🦆", "🎯"].includes(message.content)) return false;
  return true;
}

export async function pullup() {
  let activeTarget = await postTarget();

  client.on(Events.MessageReactionAdd, async (reaction, user) => {
    try {
      const message = await reaction.message.fetch();
      if (!isTargetMessage(message)) return;
      await reaction.users.remove(user.id);
      if (reaction.emoji.name !== "🔫") {
        console.log(
          `[DUCKSHOT] ${user.username} tried to shoot with ${reaction.emoji.name} instead of 🔫`,
        );
        return;
      }

      const member = await client.guild.members.fetch(user.id);
      const role = [...member.roles.cache.values()].find((r) =>
        r.name.startsWith("Team "),
      );

      if (!role) {
        console.log(`[DUCKSHOT] ${user.username} has no team role`);
        return;
      }

      const target = message.content;
      const points = target === "🦆" ? 5 : 1;

      await message?.delete();

      await awardPoints(
        roleNameToTeam(role.name),
        points,
        `shooting a ${target} in ${channelMention(message.channelId)}`,
        member.user,
      );

      // If this is not our active message, we must have restarted. Award points but don't carry on a new chain.
      if (message.id !== activeTarget?.id) {
        console.log(
          `[DUCKSHOT] ${user.username} shot an old target for ${points} point(s) to ${role.name}!`,
        );
        return;
      }

      // Post a new target at some time in the next 1-4 minutes
      const nextTime = (Math.random() * 3 + 1) * 1000 * 60;
      console.log(
        `[DUCKSHOT] ${user.username} shot the target for ${points} point(s) to ${role.name}! Next one in ${nextTime / 1000} seconds`,
      );

      setTimeout(async () => (activeTarget = await postTarget()), nextTime);
    } catch (error) {
      if (error instanceof DiscordAPIError) {
        console.error(`[DUCKSHOT] DiscordAPIError: ${error.message}`);
        return;
      }
      throw error;
    }
  });
}
