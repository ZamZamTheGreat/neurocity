"use client";

import { useEffect, useState } from "react";
import { NeuroConcierge } from "./NeuroConcierge";

const items = [
  { href: "/", icon: "⌂", label: "Home" },
  { href: "/marketplace", icon: "▦", label: "Shop" },
  { href: "/malls", icon: "◇", label: "Malls" },
  { href: "/access", icon: "◎", label: "Account" },
];

export function MobileDock() {
  const [path, setPath] = useState("");
  const [selmaOpen, setSelmaOpen] = useState(false);
  const [companionName, setCompanionName] = useState("Selma");
  useEffect(() => {
    setPath(window.location.pathname);
    const openSelma = () => setSelmaOpen(true);
    const updateCompanionName = (event: Event) => {
      const name = (event as CustomEvent<string>).detail;
      if (name) setCompanionName(name);
    };
    window.addEventListener("neurocity:open-selma", openSelma);
    window.addEventListener("neurocity:companion-name", updateCompanionName);
    fetch("/api/concierge/profile")
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (data?.profile?.companionName) setCompanionName(data.profile.companionName);
      })
      .catch(() => undefined);
    return () => {
      window.removeEventListener("neurocity:open-selma", openSelma);
      window.removeEventListener("neurocity:companion-name", updateCompanionName);
    };
  }, []);
  return (
    <>
      <nav className={`mobile-dock${selmaOpen ? " selma-open" : ""}`} aria-label="Mobile navigation">
        {items.slice(0, 2).map((item) => {
          const active = path === item.href;
          return (
            <a key={item.href} className={active ? "active" : ""} href={item.href} aria-current={active ? "page" : undefined}>
              <i aria-hidden="true">{item.icon}</i><span>{item.label}</span>
            </a>
          );
        })}
        <button className={`mobile-selma${selmaOpen ? " active" : ""}`} onClick={() => setSelmaOpen(true)} aria-label={`Ask ${companionName}`} aria-expanded={selmaOpen}>
          <i aria-hidden="true">✦</i><span>{companionName}</span>
        </button>
        {items.slice(2).map((item) => {
          const active = item.href === "/access"
            ? path === "/access" || path === "/account" || path === "/mall-manager" || path === "/admin"
            : path.startsWith(item.href);
          return (
            <a key={item.href} className={active ? "active" : ""} href={item.href} aria-current={active ? "page" : undefined}>
              <i aria-hidden="true">{item.icon}</i><span>{item.label}</span>
            </a>
          );
        })}
      </nav>
      <NeuroConcierge open={selmaOpen} onClose={() => setSelmaOpen(false)} />
    </>
  );
}
