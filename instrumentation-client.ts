import { initBotId } from "botid/client/core";
import { emailBotRoutes } from "./lib/learning-auth/botid-policy";
initBotId({ protect: emailBotRoutes });
