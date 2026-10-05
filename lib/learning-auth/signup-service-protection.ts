import { checkBotId } from "botid/server";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { createSignupProtection } from "./signup-protection";

export const freeSignupEnabled = () => process.env.GUITARHUB_FREE_SIGNUP_ENABLED === "true";
export const protectEmailAuth = createSignupProtection({
  configuration: () => {
    const salt = process.env.GUITARHUB_AUTH_RATE_LIMIT_SALT;
    return salt && process.env.GUITARHUB_AUTH_REDIS_REST_URL && process.env.GUITARHUB_AUTH_REDIS_REST_TOKEN
      ? { salt, vercel: process.env.VERCEL === "1" } : null;
  },
  checkBot: async () => {
    const result = await checkBotId({ advancedOptions: { checkLevel: "basic" }, developmentOptions: { isDevelopment: false } });
    return { isBot: result.isBot || !result.isHuman || result.bypassed };
  },
  limit: async (bucket, identity) => {
    const redis = new Redis({url: process.env.GUITARHUB_AUTH_REDIS_REST_URL!, token: process.env.GUITARHUB_AUTH_REDIS_REST_TOKEN!});
    const limiter = new Ratelimit({redis, prefix: `guitarhub:auth:${bucket}`, analytics: false, ephemeralCache: false,
      timeout: 3000, limiter: bucket === "send-email" ? Ratelimit.slidingWindow(1,"60 s")
        : bucket === "send-ip" ? Ratelimit.slidingWindow(5,"1 h") : Ratelimit.slidingWindow(10,"10 m")});
    return limiter.limit(identity);
  },
});
