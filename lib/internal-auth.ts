import { timingSafeEqual } from "node:crypto";

export function hasValidOperationsToken(request: Request) {
  const expected = process.env.ORDER_OPERATIONS_TOKEN?.trim();
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!expected || !supplied) return false;
  const left = Buffer.from(supplied);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}
