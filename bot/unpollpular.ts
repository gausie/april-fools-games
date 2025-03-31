import {
  ChannelType,
  Message,
  PermissionsBitField,
  SendableChannels,
} from "discord.js";
import { client } from "./client.js";
import { awardPoints, CONTAINER, roleNameToTeam } from "./constants.js";

type NamedCharRange = "emoticons" | "food" | "animals" | "expressions";

const CHAR_RANGE = {
  emoticons: [0x1f600, 0x1f64f],
  food: [0x1f32d, 0x1f37f],
  animals: [0x1f400, 0x1f4d3],
  expressions: [0x1f910, 0x1f92f],
};

const randomEmoji = function (range: NamedCharRange = "emoticons"): string {
  const [max, min] = CHAR_RANGE[range];
  const codePoint = Math.floor(Math.random() * (max - min) + min);
  return String.fromCodePoint(codePoint);
};

const CHANNEL_NAME = `unpollpular-📊`;

const GAME_LENGTH = 1; // in hours

async function createPoll(channel: SendableChannels) {
  const types = [...Object.keys(CHAR_RANGE)];
  const range = types[
    Math.floor(Math.random() * types.length)
  ] as NamedCharRange;

  const answers = Array(4)
    .fill(0)
    .map(() => {
      const emoji = randomEmoji(range);
      return {
        emoji,
        text: `${emoji}${"!".repeat(Math.floor(Math.random() * 4))}`,
      };
    });

  console.log(
    `[UNPOLLPULAR] Created poll with answers: ${answers.map((a) => a.emoji).join(", ")}`,
  );

  return await channel.send({
    poll: {
      allowMultiselect: false,
      answers,
      duration: GAME_LENGTH,
      question: {
        text: "What answer will lose?",
      },
    },
  });
}

export async function pullup() {
  console.log("[UNPOLLPULAR] Starting");
  let pollMessage: Message | undefined = undefined;

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
        "Welcome to unpollpular! Try to vote for the least popular option by the time the poll is over :)",
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
  pollMessage = messages.last();
  if (!pollMessage) {
    pollMessage = await createPoll(channel);
  }

  setInterval(async () => {
    if (!pollMessage?.poll) {
      console.log(
        "[UNPOLLPULAR] Poll message is broken? It doesn't exist or doesn't have a poll or something",
      );
      return;
    }
    const poll = pollMessage.poll;
    if (!poll.resultsFinalized) {
      return;
    }

    const losingValue =
      poll.answers.sort((a, b) => a.voteCount - b.voteCount).get(0)
        ?.voteCount ?? 0;

    const losers = poll.answers.filter((a) => a.voteCount === losingValue);

    const distribution: Record<string, number> = {};

    for (const answer of losers.values()) {
      const voters = await answer.fetchVoters();
      for (const voter of voters.values()) {
        const member = await client.guild.members.fetch(voter);
        const role = [...member.roles.cache.values()].find((r) =>
          r.name.startsWith("Team "),
        );

        if (!role) {
          console.log(`[UNPOLLPULAR] ${voter.username} has no team role`);
          return;
        }

        distribution[roleNameToTeam(role.name)] =
          (distribution[roleNameToTeam(role.name)] ?? 0) + 1;
      }
    }

    const emoji = losers.map((a) => a.emoji).join(" or ");
    const total = Object.values(distribution).reduce((a, b) => a + b, 0);

    console.log(
      `[UNPOLLPULAR] Poll over! ${total} total votes and ${emoji} lost`,
    );

    for (const [team, ratio] of Object.entries(distribution)) {
      const points = Math.floor((ratio / total) * 50);
      await awardPoints(
        team,
        points,
        `picking the least popular answer in unpollpular (${emoji})`,
      );
    }

    pollMessage = await createPoll(channel);
  }, 5000);
}
