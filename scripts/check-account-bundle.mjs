import { readFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { X509Certificate } from "node:crypto";

const certificatePath = path.resolve("lib/learning-account/AppleRootCA-G3.pem");
const certificate = new X509Certificate(await readFile(certificatePath));
assert.equal(certificate.fingerprint256.replaceAll(":", "").toLowerCase(),
  "63343abfb89a6a03ebb57e9b3f5fa7be7c4f5c756f3017b3a8c488c3653e9179");

for (const entry of ["api/learning/access/route", "api/learning/purchases/apple/route",
  "api/learning/notifications/apple/route", "account/page", "learn/[track]/page", "learn/[track]/[lessonId]/page"]) {
  const tracePath = path.resolve(`.next/server/app/${entry}.js.nft.json`);
  const trace = JSON.parse(await readFile(tracePath, "utf8"));
  assert.ok(trace.files.some(file => path.resolve(path.dirname(tracePath), file) === certificatePath),
    `${entry}: deployed server bundle must include Apple's public trust anchor`);
}
console.log("Account server bundles include the verified Apple trust anchor.");
