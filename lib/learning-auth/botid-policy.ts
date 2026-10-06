/** Keep client challenges and server validation on the same free Basic tier. */
const checkLevel = 'basic' as const;
export const emailBotRoutes = ['/auth/email/send','/auth/email/verify'].map(path=>({path,method:'POST',advancedOptions:{checkLevel}}));
export const emailBotOptions = {advancedOptions:{checkLevel},developmentOptions:{isDevelopment:false}};
