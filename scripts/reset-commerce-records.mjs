import pg from "pg";

const connectionString = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_MIGRATION_URL or DATABASE_URL is required.");
const execute = process.argv.includes("--execute");
const expectedConfirmation = "RESET-NEUROCITY-COMMERCE";
if (execute && process.env.RESET_COMMERCE_CONFIRM !== expectedConfirmation) throw new Error(`Set RESET_COMMERCE_CONFIRM=${expectedConfirmation} to execute the reset.`);
const hostname = new URL(connectionString).hostname;
const pool = new pg.Pool({ connectionString, max: 1, ssl: hostname === "localhost" || hostname === "127.0.0.1" || /^dpg-[a-z0-9-]+-a$/.test(hostname) ? false : true });

try {
  const counts = (await pool.query(`select
    (select count(*)::int from checkout_groups) as checkout_groups,
    (select count(*)::int from orders) as orders,
    (select count(*)::int from payment_transactions) as payment_transactions,
    (select count(*)::int from merchant_payment_allocations) as merchant_payment_allocations,
    (select count(*)::int from order_item_inventory_allocations where state = 'reserved') as active_stock_reservations`)).rows[0];
  const integrity = (await pool.query(`select
    (select count(*)::int from merchant_payment_allocations where abs(gross_amount - platform_fee - provider_fee - net_amount) > 0.005) as allocation_mismatches,
    (select count(*)::int from orders where abs(total - subtotal - delivery_fee) > 0.005) as order_total_mismatches,
    (select count(*)::int from payment_transactions pt join checkout_groups cg on cg.id = pt.checkout_group_id where abs(pt.amount - cg.total) > 0.005) as payment_total_mismatches,
    (select count(*)::int from checkout_groups cg where abs(cg.total - coalesce((select sum(mpa.gross_amount) from merchant_payment_allocations mpa where mpa.checkout_group_id = cg.id), 0)) > 0.005) as checkout_allocation_mismatches`)).rows[0];
  console.log(JSON.stringify({ mode: execute ? "execute" : "preview", counts, integrity }, null, 2));
  if (!execute) {
    console.log(`Preview only. Re-run with --execute and RESET_COMMERCE_CONFIRM=${expectedConfirmation} after reviewing these counts.`);
  } else {
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query(`with released as (select inventory_id, sum(quantity)::int quantity from order_item_inventory_allocations where state = 'reserved' group by inventory_id) update variant_inventory vi set reserved = greatest(0, vi.reserved - released.quantity), updated_at = now() from released where vi.id = released.inventory_id`);
      await client.query("delete from order_item_inventory_allocations");
      await client.query("delete from payment_proofs");
      await client.query("delete from order_issues");
      await client.query("delete from order_status_events");
      await client.query("delete from merchant_payment_allocations");
      await client.query("delete from order_items");
      await client.query("delete from payment_transactions");
      await client.query("delete from orders");
      await client.query("delete from checkout_groups");
      await client.query("commit");
      console.log(JSON.stringify({ status: "commerce_records_reset", completedAt: new Date().toISOString(), deleted: counts }, null, 2));
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }
} finally {
  await pool.end();
}
