import { billingHTTPHandlers } from "@/lib/learning-billing/service-handlers";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const POST=billingHTTPHandlers.webhook;
