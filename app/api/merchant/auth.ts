import { getChatGPTUser } from "../../chatgpt-auth";

export async function requirePilotMerchant() {
  const user = await getChatGPTUser();
  if (!user) return null;
  // This private deployment is owner-only. Before external sharing, replace
  // this gate with merchant_memberships keyed by user.userId and merchant id.
  return { user, merchantId: 1 };
}
