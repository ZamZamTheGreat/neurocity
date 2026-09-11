import { hasValidOperationsToken } from "../../../../lib/internal-auth";
import { runOrderOperations } from "../../../../lib/order-operations";

export async function POST(request: Request) {
  if (!hasValidOperationsToken(request)) return Response.json({ error: "Not found." }, { status: 404 });
  try {
    return Response.json(await runOrderOperations(), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("order operations failed", error);
    return Response.json({ error: "Order operations failed." }, { status: 500 });
  }
}
