import { Application } from "https://deno.land/x/abc/mod.ts";
 
const app = new Application();
 
app.static("/", ".");
 
app.start({ port: 8080 });
  