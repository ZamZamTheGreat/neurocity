"use client";

import { useEffect, useState } from "react";
import { NeuroConcierge } from "./NeuroConcierge";

const items = [
  { href: "/", icon: "⌂", label: "Home" },
  { href: "/marketplace", icon: "▦", label: "Shop" },
  { href: "/malls", icon: "◇", label: "Malls" },
  { href: "/account", icon: "◎", label: "Account" },
];

export function MobileDock() {
  const [path, setPath] = useState("");
  const [selmaOpen, setSelmaOpen] = useState(false);
  useEffect(() => setPath(window.location.pathname), []);
  return (
    <>
      <nav className="mobile-dock" aria-label="Mobile navigation">
        {items.slice(0, 2).map((item) => <a key={item.href} className={path === item.href ? "active" : ""} href={item.href}><i>{item.icon}</i><span>{item.label}</span></a>)}
        <button className="mobile-selma" onClick={() => setSelmaOpen(true)} aria-label="Ask Selma"><i>✦</i><span>Selma</span></button>
        {items.slice(2).map((item) => <a key={item.href} className={path.startsWith(item.href) ? "active" : ""} href={item.href}><i>{item.icon}</i><span>{item.label}</span></a>)}
      </nav>
      <NeuroConcierge open={selmaOpen} onClose={() => setSelmaOpen(false)} />
    </>
  );
}
