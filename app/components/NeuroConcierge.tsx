"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type Match = { id: number; name: string; collection: string | null; price: number | null; imageUrl: string | null; availableUnits: number; colours: string[]; sizes: string[]; store: { name: string; slug: string } };
type Message = { id: string; role: "user" | "companion"; text: string; matches?: Match[] };
type Profile = { companionName: string; customerName: string };
const prompts = ["Black hoodies under N$1,500", "A complete outfit under N$2,000", "A birthday gift under N$800"];
const GUEST_CHAT_KEY = "neurocity_guest_james_chat";
const money = (value: number | null) => value === null ? "Ask store for price" : `N$${new Intl.NumberFormat("en-NA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;

export function NeuroConcierge({ open, onClose, platformSlug, initialPrompt, promptKey = 0 }: { open: boolean; onClose: () => void; platformSlug?: string; initialPrompt?: string; promptKey?: number }) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [guest, setGuest] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState("James");
  const [profileError, setProfileError] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const submittedPromptKey = useRef(0);

  useEffect(() => {
    if (!open || profile) return;
    let cancelled = false;
    async function loadProfile() {
      setProfileLoading(true);
      try {
        const response = await fetch("/api/concierge/profile");
        if (cancelled) return;
        if (response.status === 401) {
          const guestProfile = { companionName: "James", customerName: "there" };
          setGuest(true); setProfile(guestProfile); setNewName("James");
          const stored = sessionStorage.getItem(GUEST_CHAT_KEY);
          const history = stored ? JSON.parse(stored) as Message[] : [];
          setMessages(history.length ? history : [{ id: "welcome", role: "companion", text: "Hi, I’m James—NeuroCity’s public shopping companion. This guest chat stays only in this browser session and is never saved to your NeuroCity account. What are you looking for?" }]);
          return;
        }
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        const next = { companionName: result.profile.companionName, customerName: result.customer.displayName };
        setProfile(next); setNewName(next.companionName);
        setMessages([{ id: "welcome", role: "companion", text: `Hi ${next.customerName}, I’m ${next.companionName}—your personal shopping companion. Tell me what you need, your preferred colour or size, and your budget.` }]);
      } catch { if (!cancelled) setProfileError("Your companion could not be opened right now."); }
      finally { if (!cancelled) setProfileLoading(false); }
    }
    void loadProfile();
    return () => { cancelled = true; };
  }, [open, profile]);
  useEffect(() => { if (open) endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [open, messages, busy]);
  useEffect(() => { if (guest && messages.length) sessionStorage.setItem(GUEST_CHAT_KEY, JSON.stringify(messages)); }, [guest, messages]);
  useEffect(() => { if (!open || !profile || !initialPrompt || !promptKey || submittedPromptKey.current === promptKey) return; submittedPromptKey.current = promptKey; void ask(initialPrompt); }, [open, profile, initialPrompt, promptKey]);
  if (!open) return null;

  async function ask(message: string) {
    const text = message.trim(); if (!text || busy || !profile) return;
    const context = messages.slice(-8).map(({ role, text: previous }) => ({ role: role === "companion" ? "assistant" : "user", text: previous }));
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", text }]); setInput(""); setBusy(true);
    try {
      const mall = platformSlug ?? new URLSearchParams(window.location.search).get("mall"); const tenantQuery = mall ? `?mall=${encodeURIComponent(mall)}` : "";
      const response = await fetch(`/api/concierge${tenantQuery}`, { method: "POST", headers: { "content-type": "application/json" }, cache: "no-store", body: JSON.stringify({ message: text, history: context }) });
      const result = await response.json();
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "companion", text: response.ok ? result.reply : result.error, matches: response.ok ? result.matches : [] }]);
    } catch { setMessages((current) => [...current, { id: crypto.randomUUID(), role: "companion", text: "I couldn’t reach the live catalogue. Please try again in a moment." }]); }
    finally { setBusy(false); }
  }
  async function rename(event: FormEvent) {
    event.preventDefault(); setProfileError("");
    const response = await fetch("/api/concierge/profile", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ companionName: newName }) });
    const result = await response.json();
    if (!response.ok) return setProfileError(result.error);
    setProfile((current) => current ? { ...current, companionName: result.profile.companionName } : current);
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "companion", text: `Perfect. You can call me ${result.profile.companionName} from now on.` }]);
    setRenaming(false);
  }
  function submit(event: FormEvent) { event.preventDefault(); void ask(input); }
  function endGuestChat() {
    sessionStorage.removeItem(GUEST_CHAT_KEY); setMessages([]); setProfile(null); setGuest(false); setInput(""); onClose();
  }

  return <div className="assistant-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }} role="presentation"><section className="assistant neuro-assistant" aria-label="Shopping companion"><header><div><img src="/branding/neurocity-mark.png" alt="" /><div><b>{profile?.companionName ?? "James"}</b><small><i /> {guest ? "Public guest session" : "Your NeuroCity shopping companion"}</small></div></div><div className="companion-header-actions">{profile && !guest && <button onClick={() => setRenaming(!renaming)} aria-label="Rename your companion">Rename</button>}{guest && <button onClick={endGuestChat}>End chat</button>}<button onClick={onClose} aria-label="Close companion">×</button></div></header>{renaming && <form className="companion-rename" onSubmit={rename}><label>Name your companion<input value={newName} minLength={2} maxLength={40} onChange={(event) => setNewName(event.target.value)} /></label><button>Save name</button>{profileError && <small>{profileError}</small>}</form>}{profileLoading ? <div className="companion-loading"><span /><p>Opening your companion…</p></div> : profileError && !profile ? <div className="companion-gate"><h2>James is unavailable</h2><p>{profileError}</p><button onClick={() => { setProfileError(""); setProfile(null); }}>Try again</button></div> : <><div className="assistant-body neuro-thread" aria-live="polite">{messages.map((message) => <article className={`neuro-message ${message.role}`} key={message.id}><div>{message.role === "companion" && <span>{profile?.companionName.slice(0, 1).toUpperCase()}</span>}<p>{message.text}</p></div>{message.matches?.length ? <div className="neuro-results">{message.matches.map((match) => <article key={match.id}><img src={match.imageUrl ?? "/branding/neurocity-mark.png"} alt="" /><div><small>{match.store.name}{match.collection ? ` · ${match.collection}` : ""}</small><b>{match.name}</b><p>{match.colours.length ? match.colours.join(" · ") : "Published product"}{match.sizes.length ? ` · ${match.sizes.join("/")}` : ""}</p><strong>{money(match.price)}</strong>{match.availableUnits > 0 && <em>{match.availableUnits} available</em>}</div><a href={`/stores/${match.store.slug}#shop`}>View</a></article>)}</div> : null}</article>)}{busy && <div className="neuro-thinking"><span /><span /><span /><small>{profile?.companionName} is searching live stores</small></div>}<div ref={endRef} /></div>{messages.length === 1 && <div className="suggestions neuro-prompts">{prompts.map((prompt) => <button key={prompt} onClick={() => void ask(prompt)}>{prompt}</button>)}</div>}<form onSubmit={submit}><label><span className="sr-only">Describe what you need</span><input value={input} maxLength={300} onChange={(event) => setInput(event.target.value)} placeholder={`Ask ${profile?.companionName ?? "James"} what you need`} /></label><button disabled={busy || input.trim().length < 2}>{busy ? "…" : "Send"}</button></form><footer>{guest ? <><span>This chat is stored only in this browser session.</span><a href="/login?return_to=%2F"> Sign in to personalise James</a></> : `${profile?.companionName} only recommends products currently published by approved stores.`}</footer></>}</section></div>;
}
