import { client } from "./client.js";
import * as scaffold from "./scaffold.js";
import * as tugofwar from "./tugofwar.js";
import * as plinko from "./plinko.js";
import * as duckshoot from "./duckshoot.js";
import * as kissingbooth from "./kissingbooth.js";

await client.login();
console.log("Online");

await scaffold.pullup();
await tugofwar.pullup();
await plinko.pullup();
await duckshoot.pullup();
await kissingbooth.pullup();

console.log("Let the games commence/continue");
