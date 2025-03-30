import {
  ChannelType,
  EmbedBuilder,
  GuildFeature,
  PermissionsBitField,
} from "discord.js";
import { client } from "./client.js";
import {
  CONTAINER,
  GENERAL,
  SCORES,
  teamChannelName,
  teamRoleName,
  TEAMS,
  teamSymbol,
} from "./constants.js";

export async function pullup() {
  const roles = await client.guild.roles.fetch();
  const channels = await client.guild.channels.fetch();

  let container = channels.find((c) => c?.name === CONTAINER);
  if (!container) {
    container = await client.guild.channels.create({
      name: CONTAINER,
      type: ChannelType.GuildCategory,
    });
  }

  if (container.type !== ChannelType.GuildCategory) return;

  // Create the general chat channel
  if (!channels.find((c) => c?.name === GENERAL)) {
    await client.guild.channels.create({
      name: GENERAL,
      type: ChannelType.GuildText,
      parent: container,
    });
  }

  // Create scoring channel
  if (!channels.find((c) => c?.name === SCORES)) {
    const scoresChannel = await client.guild.channels.create({
      name: SCORES,
      type: ChannelType.GuildText,
      parent: container,
      permissionOverwrites: [
        {
          id: client.guild.id,
          deny: [
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.CreatePublicThreads,
            PermissionsBitField.Flags.CreatePrivateThreads,
            PermissionsBitField.Flags.AddReactions,
          ],
        },
      ],
    });
    const scoresPin = await scoresChannel.send({
      embeds: [
        new EmbedBuilder().setFields(
          TEAMS.map((team) => ({
            name: `${team} ${teamSymbol(team)}`,
            value: "0",
          })),
        ),
      ],
    });

    await scoresPin.pin();
  }

  // Create roles and channels for every team
  for (const team of TEAMS) {
    const roleName = teamRoleName(team);
    let role = roles.find((r) => r.name === roleName);
    if (!role) {
      role = await client.guild.roles.create({
        name: roleName,
        unicodeEmoji: client.guild.features.includes(GuildFeature.RoleIcons)
          ? teamSymbol(team)
          : undefined,
      });
    }

    const channelName = teamChannelName(team);
    let channel = channels.find((c) => c?.name === channelName);
    if (!channel) {
      channel = await client.guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: container,
        permissionOverwrites: [
          {
            id: client.guild.id,
            deny: [PermissionsBitField.Flags.ViewChannel],
          },
          { id: role.id, allow: [PermissionsBitField.Flags.ViewChannel] },
        ],
      });
    }
  }
}

export async function teardown() {
  await client.login();

  const roles = await client.guild.roles.fetch();
  const channels = await client.guild.channels.fetch();

  const container = channels.find((c) => c?.name === CONTAINER);
  if (container && container.type === ChannelType.GuildCategory) {
    for (const channel of container.children.cache.values()) {
      await channel.delete();
    }
    await container.delete();
  }

  for (const team of TEAMS) {
    await roles.find((r) => r.name === teamRoleName(team))?.delete();
  }

  process.exit();
}
