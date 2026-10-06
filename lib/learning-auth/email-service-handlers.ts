import { accountConfiguration } from "./config";
import { accountServerClient } from "./server";
import { createEmailAuthHandlers } from "./email-handlers";

import { freeSignupEnabled, protectEmailAuth } from "./signup-service-protection";

export const emailAuthHandlers = createEmailAuthHandlers({ enabled: () => accountConfiguration() !== null, client: accountServerClient, signupEnabled: freeSignupEnabled, protect: protectEmailAuth });
