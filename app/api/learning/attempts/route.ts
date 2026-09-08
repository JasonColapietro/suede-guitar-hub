import { learningHandlers } from "@/lib/learning-auth/service-handlers";

export const runtime = "nodejs";

export const GET = learningHandlers.readAttempts;
export const POST = learningHandlers.appendAttempts;
export const DELETE = learningHandlers.clearHistory;
