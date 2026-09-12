"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const messages: Record<string, { title: string; copy: string; tone: string }> = {
  paid: { title: "Payment successful", copy: "Your payment was verified with PayToday and your orders were sent to the relevant merchants.", tone: "success" },
  pending: { title: "Payment processing", copy: "PayToday is still processing this payment. NeuroCity will keep checking its status.", tone: "pending" },
  verification_pending: { title: "Verification in progress", copy: "We could not complete the status check yet. Your order is safe and the transaction will be reconciled automatically.", tone: "pending" },
  failed: { title: "Payment unsuccessful", copy: "PayToday reported that the payment failed. Reserved stock has been released and the items were returned to your bag.", tone: "failed" },
  cancelled: { title: "Payment cancelled", copy: "The checkout was cancelled and reserved stock has been released.", tone: "failed" },
  expired: { title: "Payment expired", copy: "The PayToday session expired. Reserved stock has been released so you can begin a new checkout.", tone: "failed" },
  refund_required: { title: "Payment received after cancellation", copy: "The payment arrived after checkout was cancelled. NeuroCity has flagged it for refund review and will not send the order for fulfilment.", tone: "pending" },
};

export default function PaymentReturnPage() {
  const [result, setResult] = useState("pending");
  const [reference, setReference] = useState("");
  useEffect(() => { const params = new URLSearchParams(window.location.search); setResult(params.get("payment") ?? "pending"); setReference(params.get("reference") ?? ""); }, []);
  const message = messages[result] ?? { title: "Payment status unavailable", copy: "Open your NeuroCity orders to check the latest verified payment status.", tone: "pending" };
  const servicePayment = reference.startsWith("NCS-");
  return <main className="payment-return-page"><section className={`payment-return-card ${message.tone}`}><span aria-hidden="true">{message.tone === "success" ? "✓" : message.tone === "failed" ? "!" : "…"}</span><small>PAYTODAY CHECKOUT</small><h1>{message.title}</h1><p>{message.copy}</p>{reference && <strong>{reference}</strong>}<div>{servicePayment ? <Link href="/account?tab=Bookings">Return to NeuroCity bookings</Link> : <Link href="/account?tab=Orders">Return to NeuroCity orders</Link>}<Link href="/" className="secondary">Go to home</Link></div><small>You can safely close the PayToday payment tab after returning to NeuroCity.</small></section></main>;
}
