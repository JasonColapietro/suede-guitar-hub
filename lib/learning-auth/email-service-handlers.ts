import { accountConfiguration } from "./config";
import { accountServerClient } from "./server";
import { createEmailAuthHandlers } from "./email-handlers";

export const emailAuthHandlers = createEmailAuthHandlers({ enabled: () => accountConfiguration() !== null, client: accountServerClient });
