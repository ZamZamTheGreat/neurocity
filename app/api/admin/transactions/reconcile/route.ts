import { getChatGPTUser } from "../../../../chatgpt-auth";
import { reconcilePendingPayTodayTransactions } from "../../../../../lib/payment-reconciliation";

export async function POST() {
  const user = await getChatGPTUser();
  if (user?.platformRole !== "administrator") return Response.json({ error: "Administrator access required." }, { status: 403 });
  const result = await reconcilePendingPayTodayTransactions(10, user.userId);
  return Response.json(result, { headers: { "cache-control": "no-store" } });
}
