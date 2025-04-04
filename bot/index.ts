import { client } from "./client.js";
import * as scaffold from "./scaffold.js";
import * as tugofwar from "./tugofwar.js";
import * as plinko from "./plinko.js";
import * as duckshoot from "./duckshoot.js";
import * as kissingbooth from "./kissingbooth.js";
import * as unpollpular from "./unpollpular.js";

console.log("Logging in");
await client.login();

await scaffold.pullup();
await tugofwar.pullup();
await plinko.pullup();
await unpollpular.pullup();
await kissingbooth.pullup();
await duckshoot.pullup();

console.log("Let the games commence/continue");
