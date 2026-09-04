import { definePlugin } from "emdash";

/**
 * Email delivery via the Alchemy Labs mail relay (Swiss / Infomaniak).
 *
 * EmDash auth mail (magic-link login, passkey invites) goes
 * Worker --HTTPS--> Labs /api/mail/send --SMTP--> Infomaniak, sending as
 * hermes@prima.li. No US processor. Set LABS_MAIL_KEY as a Worker secret.
 */
const RELAY_URL = "https://opus.alchemy.zuerich/api/mail/send";
const DEFAULT_WORKSPACE = "f4005c0a-5105-477d-ba3c-99aaa410f600"; // VitaLunaris

async function deliverViaRelay(event: any, ctx: any): Promise<void> {
  const env = (globalThis as any).process?.env ?? {};
  const apiKey = env.LABS_MAIL_KEY;
  const workspace = env.LABS_MAIL_WORKSPACE || DEFAULT_WORKSPACE;
  const { to, subject, text, html } = event?.message ?? {};

  if (!apiKey) {
    ctx?.log?.error?.("LABS_MAIL_KEY not set — email not delivered", { to });
    throw new Error("Email transport not configured (LABS_MAIL_KEY missing)");
  }

  const doFetch = ctx?.http?.fetch ?? fetch;
  const res = await doFetch(RELAY_URL, {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
      "X-Workspace-ID": workspace,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ to, subject, text: text ?? "", ...(html ? { html } : {}) }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    ctx?.log?.error?.("Relay delivery failed", { status: res.status, body });
    throw new Error(`Relay delivery failed: ${res.status}`);
  }
  ctx?.log?.info?.("Email delivered via Labs relay (Infomaniak)", { to, subject });
}

export function createPlugin(_options: Record<string, unknown> = {}) {
  return definePlugin({
    id: "vitalunaris-email",
    version: "1.0.0",
    capabilities: ["email:provide", "network:fetch:any"],
    hooks: {
      "email:deliver": { exclusive: true, handler: deliverViaRelay },
    },
  });
}

export default createPlugin;
