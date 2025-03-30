import { ChannelType, DiscordAPIError, Events } from "discord.js";
import { client } from "./client.js";
import { CONTAINER } from "./constants.js";

const CHANNEL_NAME = `kennys-kissing-booth-🧑‍❤️‍💋‍🧑`;

export async function pullup() {
  let container = client.guild.channels.cache.find(
    (c) => c?.name === CONTAINER,
  );
  if (container?.type !== ChannelType.GuildCategory) return;

  let channel = client.guild.channels.cache.find((c) =>
    c.name.startsWith("kennys-kissing-booth"),
  );

  if (!channel) {
    channel = await client.guild.channels.create({
      name: CHANNEL_NAME,
      topic:
        "Welcome to the Kenny's CircASS kissing booth! Kenny gave us a tonne of kisses to hand out, so post your message below and receive a kiss from Kenny!",
      type: ChannelType.GuildText,
      parent: container,
      rateLimitPerUser: 60 * 60,
    });
  }

  client.on(Events.MessageCreate, async (message) => {
    try {
      if (message.channelId !== channel?.id) return;
      await message.react("💋");
    } catch (error) {
      if (error instanceof DiscordAPIError) {
        console.error(`[KISSING BOOTH] DiscordAPIError: ${error.message}`);
        return;
      }
      throw error;
    }
  });
}
