/**
 * SelfClaw API Integration Service
 *
 * Handles verification of agents through the SelfClaw API
 */

import type { SelfClawAgentResponse } from "./types.js";

const DEFAULT_SELFCLAW_API_URL = "https://selfclaw.ai";

/**
 * Verify an agent's public key with SelfClaw
 *
 * @param publicKey - Agent's public key in SPKI DER format (base64)
 * @param apiBaseUrl - SelfClaw API base URL (optional)
 * @returns Agent verification response with humanId if verified
 */
export async function verifyAgent(
  publicKey: string,
  apiBaseUrl: string = DEFAULT_SELFCLAW_API_URL,
): Promise<SelfClawAgentResponse> {
  const url = new URL(`${apiBaseUrl}/api/selfclaw/v1/agent`);
  url.searchParams.append("publicKey", publicKey);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return {
        verified: false,
        publicKey,
      };
    }
    throw new Error(
      `SelfClaw API error: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as SelfClawAgentResponse;
}

/**
 * Check if an agent is verified and has a humanId
 *
 * @param publicKey - Agent's public key in SPKI DER format (base64)
 * @param apiBaseUrl - SelfClaw API base URL (optional)
 * @returns Object with verified status and humanId if available
 */
export async function checkVerification(
  publicKey: string,
  apiBaseUrl?: string,
): Promise<{ verified: boolean; humanId?: string }> {
  const agent = await verifyAgent(publicKey, apiBaseUrl);

  if (!agent.verified || !agent.humanId) {
    return { verified: false };
  }

  return {
    verified: true,
    humanId: agent.humanId,
  };
}
