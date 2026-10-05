import { initBotId } from "botid/client/core";
initBotId({ protect: [
  { path: "/auth/email/send", method: "POST" },
  { path: "/auth/email/verify", method: "POST" },
] });
