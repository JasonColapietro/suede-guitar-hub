// Explicit local-only test runner: creates a disposable network-isolated DB.
// Never accepts a DATABASE_URL, target host, credential or existing container.
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

const container = `guitarhub-intake-test-${randomUUID()}`;
const run = (command, args, input = "") => new Promise((resolve, reject) => {
  const child = spawn(command, args, { stdio: ["pipe", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  child.on("error", reject);
  child.on("close", (code) => code === 0 ? resolve(output.trim()) : reject(new Error(`${command} exited ${code}: ${output}`)));
  child.stdin.end(input);
});
const sql = (input) => run("docker", ["exec", "-i", container, "psql", "-U", "postgres", "-At", "-v", "ON_ERROR_STOP=1"], input);
try {
  await run("docker", ["run", "--rm", "--network", "none", "--name", container, "-e", "POSTGRES_HOST_AUTH_METHOD=trust", "-d", "postgres:17-alpine"]);
  for (let i = 0; ; i += 1) {
    try { await run("docker", ["exec", container, "pg_isready", "-U", "postgres"]); break; }
    catch (error) { if (i === 30) throw error; await new Promise((resolve) => setTimeout(resolve, 250)); }
  }
  await sql(await readFile(new URL("../docs/intake/hosted-outbox-proposal.sql", import.meta.url), "utf8"));
  await sql(await readFile(new URL("../tests/fixtures/intake-hosted-outbox.sql", import.meta.url), "utf8"));
  await sql(`SELECT public.guitarhub_intake_enqueue('application:concurrent-1','application','{"kind":"application"}',NULL);
    SELECT public.guitarhub_intake_enqueue('application:concurrent-2','application','{"kind":"application"}',NULL);`);
  const claims = await Promise.all([1, 2].map(() => sql("BEGIN; SELECT public.guitarhub_intake_claim()->>'id'; SELECT pg_sleep(0.25); COMMIT;")));
  const ids = claims.map((text) => text.split("\n").find((line) => line.startsWith("application:concurrent-")));
  if (ids.some((id) => !id) || new Set(ids).size !== 2) throw new Error(`concurrent claims failed: ${claims}`);
  await run("docker", ["restart", container]);
  for (let i = 0; ; i += 1) {
    try { await run("docker", ["exec", container, "pg_isready", "-U", "postgres"]); break; }
    catch (error) { if (i === 30) throw error; await new Promise((resolve) => setTimeout(resolve, 250)); }
  }
  const retained = await sql("SELECT count(*) FROM guitarhub_intake_private.jobs WHERE id IN ('application:concurrent-1','application:concurrent-2') AND state='working';");
  if (retained !== "2") throw new Error("restart lost durable rows");
  console.info("PostgreSQL synthetic idempotency, lease fencing, retry/repair, lane quota, concurrent claim and restart tests passed.");
} finally {
  await run("docker", ["rm", "-f", container]).catch(() => {});
}
