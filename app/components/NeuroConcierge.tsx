"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type Match = {
  id: number;
  name: string;
  collection: string | null;
  price: number | null;
  imageUrl: string | null;
  availableUnits: number;
  availability?: "in_stock" | "preorder" | "out_of_stock" | "bookable";
  colours: string[];
  sizes: string[];
  fulfillment?: { pickup: boolean; delivery: boolean };
  branches?: { name: string; address: string; city: string }[];
  store: { name: string; slug: string };
};
type Message = {
  id: string;
  role: "user" | "companion";
  text: string;
  matches?: Match[];
  imagePreview?: string;
};
type Profile = { id?: number; companionName: string; customerName: string; memoryEnabled: boolean };
const prompts = [
  "A local birthday gift under N$800",
  "An outfit for a Windhoek weekend under N$2,000",
  "What can I collect locally today?",
];
const GUEST_CHAT_KEY = "neurocity_guest_selma_chat";
const money = (value: number | null) =>
  value === null
    ? "Ask store for price"
    : `N$${new Intl.NumberFormat("en-NA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;

export function NeuroConcierge({
  open,
  onClose,
  platformSlug,
  initialPrompt,
  promptKey = 0,
}: {
  open: boolean;
  onClose: () => void;
  platformSlug?: string;
  initialPrompt?: string;
  promptKey?: number;
}) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [guest, setGuest] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState("Selma");
  const [profileError, setProfileError] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
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
          const guestProfile = {
            companionName: "Selma",
            customerName: "there",
            memoryEnabled: false,
          };
          setGuest(true);
          setProfile(guestProfile);
          setNewName("Selma");
          const stored = sessionStorage.getItem(GUEST_CHAT_KEY);
          const history = stored ? (JSON.parse(stored) as Message[]) : [];
          setMessages(
            history.length
              ? history
              : [
                  {
                    id: "welcome",
                    role: "companion",
                    text: "Hello! I’m Selma, your local NeuroCity shopping companion. I search live Namibian catalogues and prices in N$. This guest chat stays only in this browser session. What can I help you find?",
                  },
                ],
          );
          return;
        }
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        const next = {
          id: result.profile.id,
          companionName: result.profile.companionName,
          customerName: result.customer.displayName,
          memoryEnabled: result.profile.memoryEnabled === true,
        };
        setProfile(next);
        setNewName(next.companionName);
        const welcome: Message =
          {
            id: "welcome",
            role: "companion",
            text: `Hello ${next.customerName}, I’m ${next.companionName}—your local shopping companion. Tell me what you need, your town or preferred pickup area, and your budget in N$. I’ll check NeuroCity’s live Namibian catalogues.`,
          };
        let remembered: Message[] = [];
        if (next.memoryEnabled && next.id) {
          try { remembered = JSON.parse(localStorage.getItem(`neurocity_selma_chat_${next.id}`) ?? "[]") as Message[]; } catch { remembered = []; }
        }
        setMessages(remembered.length ? remembered : [welcome]);
      } catch {
        if (!cancelled)
          setProfileError("Your companion could not be opened right now.");
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    }
    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [open, profile]);
  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [open, messages, busy]);
  useEffect(() => {
    if (guest && messages.length)
      sessionStorage.setItem(GUEST_CHAT_KEY, JSON.stringify(messages.map(({ imagePreview: _imagePreview, ...message }) => message)));
  }, [guest, messages]);
  useEffect(() => {
    if (!guest && profile?.id && profile.memoryEnabled && messages.length)
      localStorage.setItem(`neurocity_selma_chat_${profile.id}`, JSON.stringify(messages.slice(-40).map(({ imagePreview: _imagePreview, ...message }) => message)));
  }, [guest, profile, messages]);
  useEffect(() => {
    if (
      !open ||
      !profile ||
      !initialPrompt ||
      !promptKey ||
      submittedPromptKey.current === promptKey
    )
      return;
    submittedPromptKey.current = promptKey;
    void ask(initialPrompt);
  }, [open, profile, initialPrompt, promptKey]);
  if (!open) return null;

  async function ask(message: string) {
    const text = message.trim();
    if (!text || busy || !profile) return;
    const context = messages
      .slice(-8)
      .map(({ role, text: previous }) => ({
        role: role === "companion" ? "assistant" : "user",
        text: previous,
      }));
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", text },
    ]);
    setInput("");
    setBusy(true);
    try {
      const mall =
        platformSlug ?? new URLSearchParams(window.location.search).get("mall");
      const tenantQuery = mall ? `?mall=${encodeURIComponent(mall)}` : "";
      const response = await fetch(`/api/concierge${tenantQuery}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ message: text, history: context }),
      });
      const result = await response.json();
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "companion",
          text: response.ok ? result.reply : result.error,
          matches: response.ok ? result.matches : [],
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "companion",
          text: "I couldn’t reach the live catalogue. Please try again in a moment.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }
  async function rename(event: FormEvent) {
    event.preventDefault();
    setProfileError("");
    const response = await fetch("/api/concierge/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ companionName: newName }),
    });
    const result = await response.json();
    if (!response.ok) return setProfileError(result.error);
    setProfile((current) =>
      current
        ? { ...current, companionName: result.profile.companionName }
        : current,
    );
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "companion",
        text: `Perfect. You can call me ${result.profile.companionName} from now on.`,
      },
    ]);
    setRenaming(false);
  }
  async function toggleMemory() {
    if (!profile || guest) return;
    setProfileError("");
    const enabled = !profile.memoryEnabled;
    const response = await fetch("/api/concierge/profile", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ memoryEnabled: enabled }) });
    const result = await response.json();
    if (!response.ok) return setProfileError(result.error);
    if (!enabled && profile.id) localStorage.removeItem(`neurocity_selma_chat_${profile.id}`);
    setProfile({ ...profile, memoryEnabled: enabled });
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "companion", text: enabled ? "Memory is on for this device. I’ll keep this conversation here until you clear it or turn memory off." : "Memory is off. This conversation will not be kept after you leave." }]);
  }
  function clearRememberedChat() {
    if (!profile?.id) return;
    localStorage.removeItem(`neurocity_selma_chat_${profile.id}`);
    setMessages([{ id: "welcome", role: "companion", text: `Hello ${profile.customerName}, I’m ${profile.companionName}. What can I help you find today?` }]);
  }
  async function findFromImage(file?: File) {
    if (!file || busy || !profile) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setProfileError("Choose a JPG, PNG or WebP screenshot.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setProfileError("Choose an image smaller than 5 MB.");
      return;
    }
    setProfileError("");
    const preview = URL.createObjectURL(file);
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", text: "Find this item or something similar.", imagePreview: preview }]);
    setBusy(true);
    try {
      const form = new FormData();
      form.append("image", file);
      const visionResponse = await fetch("/api/concierge/visual-search", { method: "POST", body: form });
      const vision = await visionResponse.json();
      if (!visionResponse.ok) throw new Error(vision.error);
      const mall = platformSlug ?? new URLSearchParams(window.location.search).get("mall");
      const tenantQuery = mall ? `?mall=${encodeURIComponent(mall)}` : "";
      const searchResponse = await fetch(`/api/concierge${tenantQuery}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ message: vision.query, history: [] }),
      });
      const search = await searchResponse.json();
      if (!searchResponse.ok) throw new Error(search.error);
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "companion", text: `${vision.summary} ${search.reply}`, matches: search.matches }]);
    } catch (error) {
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "companion", text: error instanceof Error ? error.message : "I could not analyse that image. Try again or describe the item." }]);
    } finally {
      setBusy(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    void ask(input);
  }
  function endGuestChat() {
    sessionStorage.removeItem(GUEST_CHAT_KEY);
    setMessages([]);
    setProfile(null);
    setGuest(false);
    setInput("");
    onClose();
  }

  return (
    <div
      className="assistant-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <section
        className="assistant neuro-assistant"
        aria-label="Shopping companion"
      >
        <header>
          <div>
            <img src="/branding/neurocity-mark.png" alt="" />
            <div>
              <b>{profile?.companionName ?? "Selma"}</b>
              <small>
                <i />{" "}
                {guest
                  ? "Guest · live Namibian catalogues"
                  : "Your local shopping companion"}
              </small>
            </div>
          </div>
          <div className="companion-header-actions">
            {profile && !guest && (
              <>
                <button onClick={() => void toggleMemory()} aria-pressed={profile.memoryEnabled}>{profile.memoryEnabled ? "Memory on" : "Memory off"}</button>
                {profile.memoryEnabled && <button onClick={clearRememberedChat}>Clear chat</button>}
                <button onClick={() => setRenaming(!renaming)} aria-label="Rename your companion">Rename</button>
              </>
            )}
            {guest && <button onClick={endGuestChat}>End chat</button>}
            <button onClick={onClose} aria-label="Close companion">
              ×
            </button>
          </div>
        </header>
        {renaming && (
          <form className="companion-rename" onSubmit={rename}>
            <label>
              Name your companion
              <input
                value={newName}
                minLength={2}
                maxLength={40}
                onChange={(event) => setNewName(event.target.value)}
              />
            </label>
            <button>Save name</button>
            {profileError && <small>{profileError}</small>}
          </form>
        )}
        {profileLoading ? (
          <div className="companion-loading">
            <span />
            <p>Opening your companion…</p>
          </div>
        ) : profileError && !profile ? (
          <div className="companion-gate">
            <h2>Selma is unavailable</h2>
            <p>{profileError}</p>
            <button
              onClick={() => {
                setProfileError("");
                setProfile(null);
              }}
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            <div className="assistant-body neuro-thread" aria-live="polite">
              {messages.map((message) => (
                <article
                  className={`neuro-message ${message.role}`}
                  key={message.id}
                >
                  <div>
                    {message.role === "companion" && (
                      <span>
                        {profile?.companionName.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <div className="neuro-message-content">
                      {message.imagePreview && <img src={message.imagePreview} alt="Customer shopping reference" />}
                      <p>{message.text}</p>
                    </div>
                  </div>
                  {message.matches?.length ? (
                    <div className="neuro-results">
                      {message.matches.map((match) => (
                        <article key={match.id}>
                          <img
                            src={
                              match.imageUrl ?? "/branding/neurocity-mark.png"
                            }
                            alt=""
                          />
                          <div>
                            <small>
                              {match.store.name}
                              {match.collection ? ` · ${match.collection}` : ""}
                            </small>
                            <b>{match.name}</b>
                            <p>
                              {match.colours.length
                                ? match.colours.join(" · ")
                                : "Published product"}
                              {match.sizes.length
                                ? ` · ${match.sizes.join("/")}`
                                : ""}
                            </p>
                            <strong>{money(match.price)}</strong>
                            {match.availability === "preorder" ? (
                              <em>Available by preorder</em>
                            ) : match.availability === "bookable" ? (
                              <em>Available to book</em>
                            ) : match.availableUnits > 0 ? (
                              <em>{match.availableUnits} in stock</em>
                            ) : null}
                            {match.branches?.[0] && (
                              <small>{match.branches[0].city} · {match.fulfillment?.pickup ? "Pickup" : ""}{match.fulfillment?.pickup && match.fulfillment?.delivery ? " + " : ""}{match.fulfillment?.delivery ? "Delivery" : ""}</small>
                            )}
                          </div>
                          <a href={`/stores/${match.store.slug}#shop`}>View</a>
                        </article>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
              {busy && (
                <div className="neuro-thinking">
                  <span />
                  <span />
                  <span />
                  <small>
                    {profile?.companionName} is searching live stores
                  </small>
                </div>
              )}
              <div ref={endRef} />
            </div>
            {messages.length === 1 && (
              <div className="suggestions neuro-prompts">
                {prompts.map((prompt) => (
                  <button key={prompt} onClick={() => void ask(prompt)}>
                    {prompt}
                  </button>
                ))}
              </div>
            )}
            <form onSubmit={submit}>
              <input ref={imageInputRef} className="visual-search-input" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => void findFromImage(event.target.files?.[0])} />
              <button className="visual-search-button" type="button" disabled={busy} onClick={() => imageInputRef.current?.click()} aria-label="Upload a screenshot or take a photo to search">
                <span aria-hidden="true">▧</span>
                <b>Photo</b>
              </button>
              <label>
                <span className="sr-only">Describe what you need</span>
                <input
                  value={input}
                  maxLength={300}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder={`Ask ${profile?.companionName ?? "Selma"} what you need`}
                />
              </label>
              <button disabled={busy || input.trim().length < 2}>
                {busy ? "…" : "Send"}
              </button>
            </form>
            <footer>
              <span className="visual-privacy">Photos are analysed by OpenAI for this search and are not saved to your NeuroCity account or chat history.</span>
              {guest ? (
                <>
                  <span>This chat is stored only in this browser session.</span>
                  <a href="/login?return_to=%2F">
                    {" "}
                    Sign in to personalise Selma
                  </a>
                </>
              ) : (
                `${profile?.companionName} only recommends products currently published by approved stores. ${profile?.memoryEnabled ? "Memory is stored for this account on this device." : "Memory is off."}`
              )}
            </footer>
          </>
        )}
      </section>
    </div>
  );
}
