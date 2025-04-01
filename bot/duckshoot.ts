import {
  channelMention,
  DiscordAPIError,
  Events,
  Message,
  MessageFlags,
  PermissionsBitField,
} from "discord.js";
import { client } from "./client.js";
import { awardPoints, roleNameToTeam } from "./constants.js";

async function getPossibleChannels() {
  const channels = await client.guild.channels.fetch();
  return [...channels.values()]
    .filter((c) => c !== null)
    .filter((c) => c.isSendable() && c.isTextBased())
    .filter((c) =>
      c
        .permissionsFor(client.guild.roles.everyone)
        .has([
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
        ]),
    );
}

async function postTarget() {
  const channels = await getPossibleChannels();
  const channel = channels[Math.floor(Math.random() * channels.length)];
  const target = Math.random() < 0.1 ? "🦆" : "🎯";
  console.log(`[DUCKSHOOT] Posted ${target} in ${channel.name}`);
  return await channel.send({
    content: target,
    flags: MessageFlags.SuppressNotifications,
  });
}

function isTargetMessage(message: Message<boolean>) {
  if (message.author.id !== client.user?.id) return false;
  if (!["🦆", "🎯"].includes(message.content)) return false;
  return true;
}

export async function pullup() {
  console.log("[DUCKSHOOT] Starting");
  let activeTarget = await postTarget();

  client.on(Events.MessageReactionAdd, async (reaction, user) => {
    try {
      const message = await reaction.message.fetch();
      if (!isTargetMessage(message)) return;
      await reaction.users.remove(user.id);
      if (reaction.emoji.name !== "🔫") {
        console.log(
          `[DUCKSHOOT] ${user.username} tried to shoot with ${reaction.emoji.name} instead of 🔫`,
        );
        return;
      }

      const member = await client.guild.members.fetch(user.id);
      const role = [...member.roles.cache.values()].find((r) =>
        r.name.startsWith("Team "),
      );

      if (!role) {
        console.log(`[DUCKSHOOT] ${user.username} has no team role`);
        return;
      }

      const target = message.content;
      const points = target === "🦆" ? 5 : 1;

      // Do this before we award points. If the message has already been handled (deleted), we want to create an exception before awaring points.
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
          `[DUCKSHOOT] ${user.username} shot an old target for ${points} point(s) to ${role.name}!`,
        );
        return;
      }

      // Post a new target at some time in the next 1-4 minutes
      const nextTime = (Math.random() * 3 + 1) * 1000 * 60;
      console.log(
        `[DUCKSHOOT] ${user.username} shot the target for ${points} point(s) to ${role.name}! Next one in ${nextTime / 1000} seconds`,
      );

      setTimeout(async () => (activeTarget = await postTarget()), nextTime);
    } catch (error) {
      if (error instanceof DiscordAPIError) {
        console.error(`[DUCKSHOOT] DiscordAPIError: ${error.message}`);
        return;
      }
      throw error;
    }
  });
}
