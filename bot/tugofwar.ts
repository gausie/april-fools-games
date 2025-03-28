import {
  ChannelType,
  Events,
  Message,
  MessageReaction,
  PartialMessageReaction,
  PartialUser,
  PermissionsBitField,
  Role,
  User,
  UserResolvable,
} from "discord.js";
import { client } from "./client.js";
import { CONTAINER, teamRoleName, TEAMS, teamSymbol } from "./constants.js";

const CHANNEL_NAME = `tug-of-war-🪢`;

type Pairing = {
  message?: Message;
  pair: [string, string];
  content: string;
  score: number;
};

const pairings = TEAMS.flatMap<Pairing>((a, i) =>
  TEAMS.slice(i + 1).map((b) => ({
    content: `**${a}** vs **${b}**`,
    pair: [a, b],
    message: undefined,
    score: 0,
  })),
);

function renderPairing(pairing: Pairing) {
  const ropeBefore = "⎯".repeat(Math.max(-20, 20 + pairing.score));
  const ropeAfter = "⎯".repeat(Math.min(20, 20 - pairing.score));
  return `${pairing.content}\n\n${teamSymbol(pairing.pair[0])}${ropeBefore}🪢${ropeAfter}${teamSymbol(pairing.pair[1])}\n\n`;
}

async function updateScore(
  user: UserResolvable,
  pairing: Pairing,
  roleA: Role,
  roleB: Role,
  add: boolean,
  log = false,
) {
  const member = await client.guild.members.fetch(user);
  if (member.roles.cache.has(roleA.id)) {
    log &&
      console.log(
        `[TUGOFWAR] ${add ? "Adding" : "Removing"} tug for ${pairing.pair[0]} in ${pairing.pair[0]} vs ${pairing.pair[1]} (${member.displayName})`,
      );
    pairing.score += add ? -1 : 1;
  } else if (member.roles.cache.has(roleB.id)) {
    log &&
      console.log(
        `[TUGOFWAR] ${add ? "Adding" : "Removing"} tug for ${pairing.pair[1]} in ${pairing.pair[0]} vs ${pairing.pair[1]} (${member.displayName})`,
      );
    pairing.score += add ? 1 : -1;
  } else if (add) {
    log &&
      console.log(
        `[TUGOFWAR] Removing irrelevant reaction in ${pairing.pair[0]} vs ${pairing.pair[1]} (from ${member.displayName})`,
      );
    return false;
  }
  // Score was updated - maybe tell the central game scorer
  return true;
}

export async function pullup() {
  let container = client.guild.channels.cache.find(
    (c) => c?.name === CONTAINER,
  );
  if (container?.type !== ChannelType.GuildCategory) return;

  let channel = client.guild.channels.cache.find(
    (c) => c.name === CHANNEL_NAME,
  );
  if (!channel) {
    channel = await client.guild.channels.create({
      name: CHANNEL_NAME,
      type: ChannelType.GuildText,
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
      ],
    });
  }

  if (!channel.isSendable()) return;

  const messages = await channel.messages.fetch();

  const teamRoles = Object.fromEntries(
    TEAMS.map((team) => [
      team,
      [...client.guild.roles.cache.values()].find(
        (r) => r.name === teamRoleName(team),
      )!,
    ]),
  );

  for (const pairing of pairings) {
    pairing.message = messages.find((m) =>
      m.content.startsWith(pairing.content),
    );

    if (pairing.message) {
      const pulls = pairing.message.reactions.cache.find(
        (r) => r.emoji.name === "💪",
      );
      if (pulls) {
        const users = await pulls.users.fetch();
        for (const user of users.values()) {
          if (
            !(await updateScore(
              user,
              pairing,
              teamRoles[pairing.pair[0]]!,
              teamRoles[pairing.pair[1]]!,
              true,
            ))
          ) {
            await pulls.users.remove(user);
          }
        }
      }
      await pairing.message.edit({ content: renderPairing(pairing) });
      continue;
    }

    pairing.message = await channel.send({
      content: renderPairing(pairing),
    });
  }

  async function handleAddOrRemove(
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser,
    add: boolean,
  ) {
    const pairing = pairings.find((p) => p.message === reaction.message);
    // Not related to this game
    if (!pairing) return;

    if (reaction.emoji.name !== "💪") {
      console.log(
        `[TUGOFWAR] Removing reaction that is not the right emoji (from ${user.displayName})`,
      );
      await reaction.users.remove(user.id);
      return;
    }
    const roleA = [...client.guild.roles.cache.values()].find(
      (r) => r.name === teamRoleName(pairing.pair[0]!),
    )!;
    const roleB = [...client.guild.roles.cache.values()].find(
      (r) => r.name === teamRoleName(pairing.pair[1]!),
    )!;

    if (!(await updateScore(user.id, pairing, roleA, roleB, add, true))) {
      await reaction.users.remove(user.id);
      return;
    }

    // Update score on message
    await pairing.message!.edit({ content: renderPairing(pairing) });

    // Only allow member to be in one battle at a time
    if (add) {
      for (const other of pairings) {
        if (other === pairing) continue;
        const otherReact = await other.message?.reactions
          .resolve("💪")
          ?.fetch();
        if (!otherReact) continue;
        otherReact.users.remove(user.id);
      }
    }
  }

  client.on(Events.MessageReactionAdd, async (reaction, user) => {
    handleAddOrRemove(reaction, user, true);
  });

  client.on(Events.MessageReactionRemove, async (reaction, user) => {
    handleAddOrRemove(reaction, user, false);
  });
}
