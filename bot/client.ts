import { Client, GatewayIntentBits, Partials } from "discord.js";

export class Discord extends Client {
  constructor(token: string) {
    super({
      partials: [Partials.Message, Partials.Reaction, Partials.User],
      intents: [
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.DirectMessages,
      ],
    });

    this.token = token;
  }

  get guild() {
    return this.guilds.cache.get(process.env["GUILD_ID"]!)!;
  }
}

export const client = new Discord(process.env["DISCORD_TOKEN"]!);
