import { Events } from "discord.js";
import { client } from './client.js';
import { isSacrifarseSuccessful } from './constants.js';

const CHANNEL_ID = '1356679238744412260';

const roleNameToRoleId = new Map([
  ['Hearts', '1356529659709493328'],
  ['Diamonds', '1356529663010406451'],
  ['Spades', '1356529665816264886'],
  ['Clubs', '1356529668769185854'],
]);

export async function foo() {
  console.log('SACRIFARSE Starting');

  const channel = await client.guild.channels.fetch(CHANNEL_ID);
  if (!channel) {
    console.log('Could not find the "sacrifarse" channel.');
    return;
  }

  client.on(Events.MessageCreate, async (message) => {
    if (message.channelId !== channel.id) {
      return;
    }
    let defendingName = '';
    switch (message.content) {
      case `🔪❤️`: {
        defendingName = 'Hearts';
        break;
      }
      case `🔪♦️`: {
        defendingName = 'Diamonds';
        break;
      }
      case `🔪♣️`: {
        defendingName = 'Spades';
        break;
      }
      case `🔪♠️`: {
        defendingName = 'Clubs';
        break;
      }
      default:
        break;
    }
    const member = await client.guild.members.fetch(message.author.id);
    if (!defendingName) {
      await message.react(`🚫`);
      console.log(`User "${member.user.username} (${member.id})" wrote a non-sacrifarsial message.`);
      return;
    }
    const defendingRoleId = roleNameToRoleId.get(defendingName);
    if (!defendingRoleId) {
      await message.react(`🚫`);
      console.log(`User "${member.user.username} (${member.id})"'s sacrifarce did not produce a known defending role id.`);
      return;
    }
    if (member.roles.cache.has(defendingRoleId)) {
      await message.react(`💀`);
      console.log(`User "${member.user.username} (${member.id})" tried to betray their own team!`);
      return;
    }
    let attackingName = '';
    for (const [roleName, roleId] of roleNameToRoleId) {
      if (member.roles.cache.has(roleId)) {
        attackingName = roleName;
        break;
      }
    }
    if (!attackingName) {
      await message.react(`🚫`);
      console.log(`User "${member.user.username} (${member.id})"'s sacrifarce did not produce a known attacking role id.`);
      return;
    }
    const success = await isSacrifarseSuccessful(attackingName, defendingName, member);
    if (!success) {
      await message.react(`🚫`);
      console.log(`User "${member.user.username} (${member.id})" failed to sacrifarse.`);
      return;
    }
    await message.react(`✅`);
    console.log(`User "${member.user.username} (${member.id})" successfully sacrifarsed.`);
  });
}
