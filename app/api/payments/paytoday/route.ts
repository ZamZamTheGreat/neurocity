import { getPayTodayAvailability } from "../../../../lib/paytoday";

export async function GET() {
  const availability = getPayTodayAvailability();
  return Response.json({ provider: "paytoday", available: availability.configured, environment: availability.environment, message: availability.configured ? "PayToday is available." : "PayToday activation is pending." }, { headers: { "cache-control": "no-store" } });
}
