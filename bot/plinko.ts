import {
  ChannelType,
  codeBlock,
  DiscordAPIError,
  Events,
  Message,
  PermissionsBitField,
  User,
  userMention,
} from "discord.js";
import { client } from "./client.js";
import { awardPoints, CONTAINER, teamRoleName, TEAMS } from "./constants.js";

const CHANNEL_NAME = `plinko-📍`;

const state = {
  status: "waiting",
  team: TEAMS[Math.floor(Math.random() * TEAMS.length)],
  ball: [0, 0] as [number, number],
  message: undefined as Message | undefined,
  user: null as User | null,
  wait: 0,
};

const SPOTS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"];

const PRIZE_ROW = [
  "　",
  "🥉",
  "　",
  "🥈",
  "　",
  "🥉",
  "　",
  "　",
  "　",
  "🥇",
  "　",
  "　",
  "　",
  "🥉",
  "　",
  "🥈",
  "　",
  "🥉",
  "　",
];

async function renderBoard() {
  // Render pegs
  const pegs = [];
  pegs.push([
    "　",
    "1️⃣",
    "　",
    "2️⃣",
    "　",
    "3️⃣",
    "　",
    "4️⃣",
    "　",
    "5️⃣",
    "　",
    "6️⃣",
    "　",
    "7️⃣",
    "　",
    "8️⃣",
    "　",
    "9️⃣",
    "　",
  ]);
  pegs.push([
    "　",
    "　",
    "　",
    "　",
    "　",
    "　",
    "　",
    "　",
    "　",
    "　",
    "　",
    "　",
    "　",
    "　",
    "　",
    "　",
    "　",
    "　",
    "　",
  ]);
  for (let i = 0; i < 4; i++) {
    pegs.push([
      "　",
      "🔴",
      "　",
      "🔴",
      "　",
      "🔴",
      "　",
      "🔴",
      "　",
      "🔴",
      "　",
      "🔴",
      "　",
      "🔴",
      "　",
      "🔴",
      "　",
      "🔴",
      "　",
    ]);
    pegs.push([
      "　",
      "　",
      "　",
      "　",
      "　",
      "　",
      "　",
      "　",
      "　",
      "　",
      "　",
      "　",
      "　",
      "　",
      "　",
      "　",
      "　",
      "　",
      "　",
    ]);
    pegs.push([
      "🔴",
      "　",
      "🔴",
      "　",
      "🔴",
      "　",
      "🔴",
      "　",
      "🔴",
      "　",
      "🔴",
      "　",
      "🔴",
      "　",
      "🔴",
      "　",
      "🔴",
      "　",
      "🔴",
    ]);
    pegs.push([
      "　",
      "　",
      "　",
      "　",
      "　",
      "　",
      "　",
      "　",
      "　",
      "　",
      "　",
      "　",
      "　",
      "　",
      "　",
      "　",
      "　",
      "　",
      "　",
    ]);
  }
  pegs.push([...PRIZE_ROW]);

  let status = "";

  // Do things for current status
  switch (state.status) {
    case "active": {
      // Move the ball
      const [x, y] = state.ball;
      pegs[y][x] = "🎱";

      status = `**${userMention(state.user!.id)}** is dropping a ball for **${state.team}**!`;
      break;
    }
    case "completed": {
      // Keep showing the ball for reference
      const [x, y] = state.ball;
      pegs[y][x] = "🎱";

      const prize = PRIZE_ROW[state.ball[0]];
      let points = 0;
      switch (prize) {
        case "🥇":
          points = 5;
          break;
        case "🥈":
          points = 2;
          break;
        case "🥉":
          points = 1;
          break;
      }
      status = `**${state.team}** has scored ${points} points!`;
      if (state.wait === 0 && points > 0) {
        await awardPoints(
          state.team,
          points,
          `hitting a ${prize} in plinko`,
          state.user ?? undefined,
        );
      }
      break;
    }
    case "waiting": {
      status = `Waiting for someone from **${state.team}** to drop a ball!`;
      break;
    }
  }

  // Calculate next move
  switch (state.status) {
    case "active": {
      const [x, y] = state.ball;

      // If we are at the bottom, we are done
      if (y >= pegs.length - 1) {
        state.status = "completed";
        break;
      }

      // Always drops down
      state.ball[1]++;

      // If we can just drop down, do so
      if (pegs[y + 1][x] === "　" || y >= pegs.length - 2) break;

      // Otherwise either bounce of the walls or randomly
      if (x === 0) {
        state.ball[0]++;
      } else if (x >= pegs[0].length - 1) {
        state.ball[0]--;
      } else {
        state.ball[0] += Math.random() < 0.5 ? -1 : 1;
      }
      break;
    }
    case "completed": {
      if (state.wait++ < 5) break;
      state.wait = 0;
      state.ball = [0, 0];
      state.status = "waiting";
      state.team = TEAMS[(TEAMS.indexOf(state.team) + 1) % TEAMS.length];
      break;
    }
  }

  return `Welcome to Plinko!\n\nCurrent status: ${status}\n\n${codeBlock(pegs.map((l) => l.join("")).join("\n"))}`;
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
      topic:
        "Welcome to the Plinko game! Everyone is welcome to play, but only the team that is up can drop a ball. If that team is yours, react with the number of the peg you want to drop from!",
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

  state.message = messages.at(0) ?? (await channel.send(`Welcome to Plinko!`));

  setInterval(async () => {
    const board = await renderBoard();
    await state.message?.edit(board);
  }, 1000);

  client.on(Events.MessageReactionAdd, async (reaction, user) => {
    try {
      // Not related to this game
      if (reaction.message !== state.message) return;

      await reaction.remove();

      if (!reaction.emoji.name) return;
      if (!SPOTS.includes(reaction.emoji.name)) {
        console.log(`[PLINKO] Ignoring invalid emoji by ${user.username}`);
        return;
      }
      if (state.status !== "waiting") {
        console.log(
          `[PLINKO] Ignoring attempted play by ${user.username} while game is in progress`,
        );
        return;
      }

      const role = [...client.guild.roles.cache.values()].find(
        (r) => r.name === teamRoleName(state.team),
      )!;
      const member = await client.guild.members.fetch(user.id);
      if (!member.roles.cache.has(role.id)) {
        console.log(
          `[PLINKO] Ignoring attemped play by ${user.username} when their team is not up`,
        );
        return;
      }

      state.status = "active";
      state.user = member.user;
      state.ball = [SPOTS.indexOf(reaction.emoji.name) * 2 + 1, 0];
      console.log(
        `[PLINKO] Ball dropped by ${user.username} from ${state.team} at ${reaction.emoji.name}`,
      );
    } catch (error) {
      if (error instanceof DiscordAPIError) {
        console.error(`[PLINKO] DiscordAPIError: ${error.message}`);
        return;
      }
      throw error;
    }
  });
}
