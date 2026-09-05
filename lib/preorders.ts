// Persist the fulfilment mode in the existing order-line snapshot, so subsequent
// catalogue changes cannot make a preorder consume another order's stock.
export const PREORDER_PREFIX = "[Preorder] ";
export function isPreorderLine(item: { variantSnapshot?: string | null }) {
  return item.variantSnapshot?.startsWith(PREORDER_PREFIX) === true;
}
