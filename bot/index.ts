import { client } from "./client.js";
import * as scaffold from "./scaffold.js";
import * as tugofwar from "./tugofwar.js";
import * as plinko from "./plinko.js";

await client.login();
console.log("Online");

await scaffold.pullup();
await tugofwar.pullup();
await plinko.pullup();
console.log("Channels and roles in place");
