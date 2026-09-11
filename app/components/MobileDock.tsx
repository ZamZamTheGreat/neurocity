"use client";

import { useEffect, useState } from "react";
import { OPEN_CONCIERGE_EVENT, openConcierge, type ConciergeRequest } from "../../lib/concierge-events";
import { NeuroConcierge } from "./NeuroConcierge";

const items = [
  { href: "/", icon: "⌂", label: "Home" },
  { href: "/marketplace", icon: "▦", label: "Shop" },
  { href: "/malls", icon: "◇", label: "Malls" },
  { href: "/access", icon: "◎", label: "Account" },
];

export function MobileDock() {
  const [path, setPath] = useState("");
  const [request, setRequest] = useState<ConciergeRequest & { promptKey: number }>({ promptKey: 0 });
  const [selmaOpen, setSelmaOpen] = useState(false);
  const [companionName, setCompanionName] = useState("Selma-AI");
  useEffect(() => {
    setPath(window.location.pathname);
    const openSelma = (event: Event) => {
      const detail = (event as CustomEvent<ConciergeRequest>).detail ?? {};
      const mallPath = window.location.pathname.match(/^\/malls\/([^/]+)$/)?.[1];
      setRequest((current) => ({ ...detail, platformSlug: detail.platformSlug ?? (mallPath ? decodeURIComponent(mallPath) : undefined), promptKey: current.promptKey + 1 }));
      setSelmaOpen(true);
    };
    const updateCompanionName = (event: Event) => {
      const name = (event as CustomEvent<string>).detail;
      if (name) setCompanionName(name);
    };
    window.addEventListener(OPEN_CONCIERGE_EVENT, openSelma);
    window.addEventListener("neurocity:companion-name", updateCompanionName);
    return () => {
      window.removeEventListener(OPEN_CONCIERGE_EVENT, openSelma);
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
        <button className={`mobile-selma${selmaOpen ? " active" : ""}`} onClick={() => openConcierge()} aria-label={`Ask ${companionName}`} aria-expanded={selmaOpen}>
          <i aria-hidden="true"><img src="/selma-ai-avatar.webp" alt="" /></i><span>{companionName}</span>
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
      <NeuroConcierge {...request} open={selmaOpen} onClose={() => setSelmaOpen(false)} />
    </>
  );
}
