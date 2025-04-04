import {
  ChannelType,
  EmbedBuilder,
  GuildFeature,
  GuildMember,
  PermissionsBitField,
  Role,
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

async function assignTeams() {
  const counts = TEAMS.reduce<Record<string, number>>(
    (acc, team) => ({ ...acc, [team]: 0 }),
    {},
  );
  const roles = await client.guild.roles.fetch();
  const teamRoles = TEAMS.reduce<Record<string, Role>>(
    (acc, team) => ({
      ...acc,
      [team]: roles.find((r) => r.name === teamRoleName(team))!,
    }),
    {},
  );

  async function assignRandomTeam(member: GuildMember) {
    if (member.user.bot) return;

    const existingRole = Object.entries(teamRoles).find((r) =>
      member.roles.cache.has(r[1].id),
    );

    if (existingRole) {
      counts[existingRole[0]] += 1;
      return;
    }

    const bottomTwo = Object.entries(counts)
      .sort(([, a], [, b]) => a - b)
      .slice(0, 2);
    const team = bottomTwo[Math.floor(Math.random() * bottomTwo.length)][0];
    try {
      await member.roles.add(teamRoles[team]);
    } catch (error) {
      console.log(
        `[GENERAL] Failed to assign ${team} to ${member.user.username}: ${error}`,
      );
      return;
    }
    counts[team] += 1;
  }

  const verifiedRole = client.guild.roles.cache.find(
    (r) => r.name.toLowerCase() === "verified",
  );
  if (!verifiedRole) return;

  // Phase 1: assign teams to online, verified members
  const offlineVerified: GuildMember[] = [];
  for (const member of verifiedRole.members.values()) {
    if (member.presence?.status === "offline")
      return void offlineVerified.push(member);
    await assignRandomTeam(member);
  }

  // Phase 2: assign teams to offline, verified members
  for (const member of offlineVerified) {
    await assignRandomTeam(member);
  }

  // Phase 3: assign teams to unverified members
  const members = await client.guild.members.fetch();
  for (const member of members.values()) {
    await assignRandomTeam(member);
  }
}

export async function pullup() {
  console.log("[GENERAL] Starting");

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
  console.log("[GENERAL] Creating general chat channel");
  if (!channels.find((c) => c?.name === GENERAL)) {
    await client.guild.channels.create({
      name: GENERAL,
      type: ChannelType.GuildText,
      topic:
        "Happy festival of fools! Work with your team mates to score points via the amusements and attractions available in the server today. If you see a 🎯 (or even a 🦆) around the server, react with a 🔫 to see if you can score some points for your team!",
      parent: container,
    });
  }

  // Create scoring channel
  console.log("[GENERAL] Creating scores channel");
  if (!channels.find((c) => c?.name === SCORES)) {
    const scoresChannel = await client.guild.channels.create({
      name: SCORES,
      type: ChannelType.GuildText,
      topic:
        "Here you can keep track of the overall scores as well as how they were... scored",
      parent: container,
      permissionOverwrites: [
        {
          id: client.guild.id,
          deny: [
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.CreatePublicThreads,
            PermissionsBitField.Flags.CreatePrivateThreads,
          ],
        },
        {
          id: client.user!.id,
          allow: [
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.CreatePublicThreads,
            PermissionsBitField.Flags.CreatePrivateThreads,
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
    console.log(`[GENERAL] Creating role and channel for ${team}`);
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
            deny: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
            ],
          },
          {
            id: role.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
            ],
          },
          {
            id: client.user!.id,
            allow: [
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.CreatePublicThreads,
              PermissionsBitField.Flags.CreatePrivateThreads,
            ],
          },
        ],
      });
    }
  }

  console.log("[GENERAL] Assign everyone to teams");
  await assignTeams();
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
