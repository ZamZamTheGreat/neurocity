export const MERCHANT_CONFIRMATION_MINUTES = 30;
export const CUSTOMER_PAYMENT_MINUTES = 30;
export const ORDER_WORKFLOW = "merchant_confirmation_v1";

type Actor = "customer" | "merchant" | "system" | "payment_provider" | "admin";
type Transition = { to: string; actors: Actor[] };
const transitions: Record<string, Transition[]> = {
  pending_merchant_confirmation: [{ to: "accepted", actors: ["merchant", "admin"] }, { to: "rejected", actors: ["merchant", "admin"] }, { to: "cancelled", actors: ["customer", "admin"] }, { to: "confirmation_expired", actors: ["system", "admin"] }],
  accepted: [{ to: "payment_processing", actors: ["customer", "payment_provider"] }, { to: "payment_expired", actors: ["system", "admin"] }, { to: "cancelled", actors: ["customer", "admin"] }],
  payment_processing: [{ to: "paid", actors: ["payment_provider", "admin"] }, { to: "accepted", actors: ["payment_provider", "admin"] }, { to: "payment_expired", actors: ["system", "admin"] }],
  paid: [{ to: "preparing", actors: ["merchant", "admin"] }],
  preparing: [{ to: "ready_for_pickup", actors: ["merchant", "admin"] }, { to: "dispatched", actors: ["merchant", "admin"] }, { to: "cancelled", actors: ["merchant", "admin"] }],
  ready_for_pickup: [{ to: "collected", actors: ["merchant", "admin"] }],
  dispatched: [{ to: "delivered", actors: ["merchant", "admin"] }, { to: "delivery_failed", actors: ["merchant", "admin"] }],
  delivery_failed: [{ to: "dispatched", actors: ["merchant", "admin"] }, { to: "cancelled", actors: ["merchant", "admin"] }],
  collected: [{ to: "completed", actors: ["merchant", "admin"] }],
  delivered: [{ to: "completed", actors: ["merchant", "admin"] }],
};
export function allowedOrderTransitions(status: string, actor: Actor) { return (transitions[status] ?? []).filter((entry) => entry.actors.includes(actor)).map((entry) => entry.to); }
export function assertOrderTransition(status: string, target: string, actor: Actor) { if (!allowedOrderTransitions(status, actor).includes(target)) throw new Error(`Cannot move an order from ${status} to ${target}.`); }
export const deadlineFrom = (at: Date, minutes: number) => new Date(at.getTime() + minutes * 60_000);
