export type CohortApplication = {
  name: string;
  email: string;
  experience: string;
  goal: string;
};

export type ApplicationResult =
  | { ok: true; value: CohortApplication }
  | { ok: false; error: string };

export const APPLICATION_EMAIL_ADDRESS = "info@suedeai.ai";

const MAX_FIELD = 2000;

function clean(value: unknown, maxLength = MAX_FIELD): string {
  if (typeof value !== "string") return "";
  return value.slice(0, maxLength).replace(/[<>]/g, "").trim();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 320;
}

export function normalizeApplication(input: unknown): ApplicationResult {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Complete the application fields." };
  }
  const record = input as Record<string, unknown>;
  const name = clean(record.name, 200);
  const email = clean(record.email, 320).toLowerCase();
  const experience = clean(record.experience, 500);
  const goal = clean(record.goal);

  if (!name) return { ok: false, error: "Add your name." };
  if (!isValidEmail(email)) {
    return { ok: false, error: "Provide a valid email address." };
  }
  if (!goal) return { ok: false, error: "Name the breakthrough you want to make." };

  return {
    ok: true,
    value: {
      name,
      email,
      experience,
      goal,
    },
  };
}

export function buildApplicationEmailFallback(input: unknown): string | null {
  const normalized = normalizeApplication(input);
  if (!normalized.ok) return null;

  const application = normalized.value;
  const subject = `GuitarHub application — ${application.name}`;
  const body = [
    "New GuitarHub application",
    "",
    `Name: ${application.name}`,
    `Email: ${application.email}`,
    `Experience: ${application.experience || "(not given)"}`,
    `Goal: ${application.goal}`,
  ].join("\n");

  return `mailto:${APPLICATION_EMAIL_ADDRESS}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
