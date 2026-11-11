"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, ArrowUpRight, Bell, Bookmark, Check, CheckCheck, ChevronRight, Clock3, Copy, Cpu, FileText, House, Leaf, Mail, MessageSquare, Play, RotateCcw, Search, ShieldCheck, TrainFront, Trash2, X } from "lucide-react";
import { categories, stories as baseStories, type Story } from "./lib/stories";

type Tab = "explore" | "following" | "briefing";
type Modal = "signup" | "feedback" | "privacy" | "about" | null;
type Reader = { followed: string[]; seen: Record<string, string>; simulated: boolean };
const EMPTY: Reader = { followed: [], seen: {}, simulated: false };
const READER_KEY = "siden-sidst-reader-v1";
const TOKEN_KEY = "siden-sidst-registration-v1";
const ATTEMPT_KEY = "siden-sidst-registration-attempt-v1";
const shortDate = (date: string) => new Intl.DateTimeFormat("da-DK", { day: "numeric", month: "short", timeZone: "Europe/Copenhagen" }).format(new Date(date));
const longDate = (date: string) => new Intl.DateTimeFormat("da-DK", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Copenhagen" }).format(new Date(date));

function CategoryIcon({ category, size = 18 }: { category: string; size?: number }) {
  const Icon = category === "Transport" ? TrainFront : category === "Bolig" ? House : category === "Klima" ? Leaf : Cpu;
  return <Icon size={size} strokeWidth={1.6} aria-hidden="true" />;
}

function Logo() {
  return <span className="wordmark"><span className="brand-symbol" aria-hidden="true"><i /><i /><i /><b /></span>Siden sidst<span className="brand-dot">.</span></span>;
}

function Dialog({ open, close, title, children, wide = false }: { open: boolean; close: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (open && dialog && !dialog.open) dialog.showModal();
    if (!open && dialog?.open) dialog.close();
    if (open) { const old = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = old; }; }
  }, [open]);
  return <dialog ref={ref} aria-label={title} className={`dialog ${wide ? "dialog-wide" : ""}`} onCancel={close} onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
    <div className="dialog-inner"><button type="button" className="icon-button dialog-close" aria-label="Luk vindue" onClick={close}><X size={21} /></button>{children}</div>
  </dialog>;
}

function simulatedStory(original: Story): Story {
  return {
    ...original,
    updatedAt: "2026-12-15T10:00:00+01:00",
    summary: "Det reviderede udbud er offentliggjort. Åbning i 2030 er fortsat målet.",
    currentAnswer: "Åbningen er stadig planlagt til 2030. Det reviderede udbud er nu offentliggjort, men der er endnu ingen underskrevet kontrakt.",
    statusLabel: "Udbud offentliggjort",
    before: original.after,
    after: "Det reviderede udbud er offentliggjort som planlagt den 15. december. Tilbudsfristen er 15. marts 2027.",
    whyItMatters: "Den næste milepæl er nået. Det gør tidsplanen mere konkret, men garanterer ikke åbning i 2030.",
    uncertainty: "Vi mangler fortsat en underskrevet anlægskontrakt. Prisen og valget af entreprenør er uafklaret.",
    nextMilestone: { label: "Tilbudsfristen i det nye udbud", date: "2027-03-15" },
    timeline: [...original.timeline, { date: "2026-12-15", title: "Udbuddet er offentliggjort", body: "I denne testopdatering er det reviderede udbud offentliggjort med tilbudsfrist 15. marts 2027. Åbningsåret er fortsat 2030.", kind: "update" }],
    sources: [...original.sources, { title: "Udbudsmeddelelse · fiktivt dokument", publisher: "Lindeby Trafik · fiktiv organisation", date: "2026-12-15", excerpt: "Det reviderede udbud offentliggøres 15. december 2026. Tilbud skal være modtaget 15. marts 2027. Forventet åbning: december 2030." }],
  };
}

async function postJson(path: string, body: unknown, method = "POST") {
  const response = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const decoded: unknown = await response.json().catch(() => ({ error: "Vi kunne ikke få forbindelse. Prøv igen." }));
  const result = decoded && typeof decoded === "object" ? decoded as { error?: string; ok?: boolean; token?: string; message?: string } : {};
  if (!response.ok || result.ok !== true) throw new Error(result.error || "Det lykkedes ikke. Prøv igen.");
  return result;
}

export default function Beta() {
  const [reader, setReader] = useState<Reader>(EMPTY);
  const [ready, setReady] = useState(false);
  const [storageBlocked, setStorageBlocked] = useState(false);
  const [tab, setTab] = useState<Tab>("explore");
  const [category, setCategory] = useState("Alle emner");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState("overview");
  const [modal, setModal] = useState<Modal>(null);
  const [toast, setToast] = useState("");
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [signupDone, setSignupDone] = useState(false);
  const [signupBusy, setSignupBusy] = useState(false);
  const [signupError, setSignupError] = useState("");
  const [feedbackDone, setFeedbackDone] = useState(false);
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");
  const [clarity, setClarity] = useState<number | null>(null);
  const [wouldReturn, setWouldReturn] = useState("");
  const [comment, setComment] = useState("");
  const [deleteCode, setDeleteCode] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [dataMessage, setDataMessage] = useState("");
  const [dataError, setDataError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const signupAttempt = useRef<{ email: string; token: string } | null>(null);
  const explorerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(READER_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        const ids = new Set(baseStories.map((story) => story.id));
        const followed = Array.isArray(saved.followed) ? saved.followed.filter((id: unknown) => typeof id === "string" && ids.has(id)) : [];
        const seen: Record<string, string> = {};
        if (saved.seen && typeof saved.seen === "object") for (const [key, value] of Object.entries(saved.seen)) if (ids.has(key) && typeof value === "string") seen[key] = value;
        setReader({ followed: [...new Set(followed)] as string[], seen, simulated: saved.simulated === true });
      }
      const savedToken = localStorage.getItem(TOKEN_KEY) || "";
      if (/^[a-f0-9]{64}$/.test(savedToken)) { setToken(savedToken); setDeleteCode(savedToken); }
    } catch { setStorageBlocked(true); }
    const id = new URLSearchParams(location.search).get("sag");
    if (baseStories.some((story) => story.id === id)) setSelectedId(id);
    setReady(true);
  }, []);

  useEffect(() => { if (ready) try { localStorage.setItem(READER_KEY, JSON.stringify(reader)); } catch { setStorageBlocked(true); } }, [reader, ready]);
  useEffect(() => { if (!toast) return; const timeout = setTimeout(() => setToast(""), 4000); return () => clearTimeout(timeout); }, [toast]);

  const stories = useMemo(() => baseStories.map((story) => reader.simulated && story.id === "station-2028" ? simulatedStory(story) : story), [reader.simulated]);
  const followed = stories.filter((story) => reader.followed.includes(story.id));
  const unread = followed.filter((story) => reader.seen[story.id] !== story.updatedAt);
  const selected = stories.find((story) => story.id === selectedId);
  const exampleStory = stories.find((story) => story.id === "station-2028")!;
  const upcoming = followed.filter((story) => story.nextMilestone.date).sort((a, b) => String(a.nextMilestone.date).localeCompare(String(b.nextMilestone.date)))[0];
  const visible = (tab === "following" ? followed : stories)
    .filter((story) => category === "Alle emner" || story.category === category)
    .filter((story) => `${story.question} ${story.summary} ${story.category}`.toLocaleLowerCase("da").includes(search.toLocaleLowerCase("da").trim()))
    .sort((a, b) => sort === "alphabetical" ? a.question.localeCompare(b.question, "da") : b.updatedAt.localeCompare(a.updatedAt));

  function goTab(next: Tab, scroll = false) { setTab(next); setCategory("Alle emner"); setSearch(""); if (scroll) setTimeout(() => explorerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 40); }
  function openStory(id: string, panel = "overview") {
    setSelectedId(id); setDetailTab(panel);
    const url = new URL(location.href); url.searchParams.set("sag", id); history.replaceState(null, "", url.pathname + url.search);
  }
  function closeStory() {
    setSelectedId(null);
    const url = new URL(location.href); url.searchParams.delete("sag"); history.replaceState(null, "", url.pathname + url.search);
  }
  function toggleFollow(story: Story) {
    const exists = reader.followed.includes(story.id);
    setReader((prev) => ({ ...prev, followed: exists ? prev.followed.filter((id) => id !== story.id) : [...prev.followed, story.id], seen: exists ? prev.seen : { ...prev.seen, [story.id]: story.updatedAt } }));
    setToast(exists ? "Spørgsmålet er fjernet fra dit overblik." : "Du følger nu spørgsmålet. Vi husker det i denne browser.");
  }
  function markRead(story: Story) { setReader((prev) => ({ ...prev, seen: { ...prev.seen, [story.id]: story.updatedAt } })); setToast("Du er ajour med denne sag."); }
  function simulate() {
    const original = baseStories.find((story) => story.id === "station-2028")!;
    setReader((prev) => ({ ...prev, followed: [...new Set([...prev.followed, original.id])], seen: { ...prev.seen, [original.id]: original.updatedAt }, simulated: true }));
    goTab("briefing", true); setToast("En fiktiv testopdatering er klar i dit overblik.");
  }
  async function copy(text: string, message: string) {
    try { await navigator.clipboard.writeText(text); setToast(message); }
    catch { setToast("Kopiering er ikke tilgængelig i denne browser. Markér teksten og kopiér den."); }
  }
  async function signup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSignupBusy(true); setSignupError("");
    const data = new FormData(event.currentTarget);
    try {
      const normalized = email.trim().toLowerCase();
      if (!signupAttempt.current) try {
        const pending = JSON.parse(localStorage.getItem(ATTEMPT_KEY) || "null");
        if (pending?.email === normalized && typeof pending.token === "string" && /^[a-f0-9]{64}$/.test(pending.token)) signupAttempt.current = pending;
      } catch { /* In-memory retries remain supported when storage is unavailable. */ }
      if (!signupAttempt.current || signupAttempt.current.email !== normalized) signupAttempt.current = { email: normalized, token: Array.from(crypto.getRandomValues(new Uint8Array(32)), (value) => value.toString(16).padStart(2, "0")).join("") };
      try { localStorage.setItem(ATTEMPT_KEY, JSON.stringify(signupAttempt.current)); } catch { setStorageBlocked(true); }
      const result = await postJson("/api/subscriptions", { email, consent: data.get("consent") === "on", interests: reader.followed, website: data.get("website") || "", receiptToken: signupAttempt.current.token });
      if (typeof result.token !== "string" || !/^[a-f0-9]{64}$/.test(result.token)) throw new Error("Tilmeldingen kunne ikke bekræftes. Prøv igen.");
      setToken(result.token); setDeleteCode(result.token); setSignupDone(true);
      try { localStorage.setItem(TOKEN_KEY, result.token); localStorage.removeItem(ATTEMPT_KEY); } catch { setStorageBlocked(true); }
    } catch (error) { setSignupError(error instanceof Error ? error.message : "Prøv igen om lidt."); }
    finally { setSignupBusy(false); }
  }
  async function sendFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setFeedbackBusy(true); setFeedbackError("");
    const data = new FormData(event.currentTarget);
    try { await postJson("/api/feedback", { clarity, wouldReturn, comment, storyId: selectedId, website: data.get("website") || "" }); setFeedbackDone(true); }
    catch (error) { setFeedbackError(error instanceof Error ? error.message : "Prøv igen om lidt."); }
    finally { setFeedbackBusy(false); }
  }
  async function removeRegistration() {
    setDeleteBusy(true); setDataError(""); setDataMessage("");
    try {
      await postJson("/api/subscriptions", { token: deleteCode }, "DELETE");
      if (deleteCode.trim() === token) {
        setToken(""); setSignupDone(false);
        try { localStorage.removeItem(TOKEN_KEY); } catch { /* The server deletion has succeeded. */ }
      }
      setDeleteCode(""); setConfirmDelete(false);
      setDataMessage("Din email og dine tilmeldingsoplysninger er slettet.");
    } catch (error) { setDataError(error instanceof Error ? error.message : "Prøv igen om lidt."); }
    finally { setDeleteBusy(false); }
  }

  return <>
    <a className="skip-link" href="#questions">Gå til spørgsmålene</a>
    <div className="utility-bar"><div className="wrap"><span>ET NYHEDSMEDIE MED HUKOMMELSE</span><span>Dansk prøveudgave <i /> Fri adgang</span></div></div>
    <header className="site-header">
      <div className="header-inner">
        <a href="/" className="brand-link" aria-label="Siden sidst, forside"><Logo /><span className="header-beta">BETA</span></a>
        <nav className="desktop-nav" aria-label="Hovednavigation">
          <button className={tab === "explore" ? "active" : ""} onClick={() => goTab("explore", true)}>Udforsk</button>
          <button className={tab === "following" ? "active" : ""} onClick={() => goTab("following", true)}>Mine spørgsmål {reader.followed.length > 0 && <span className="nav-count">{reader.followed.length}</span>}</button>
          <button className={tab === "briefing" ? "active" : ""} onClick={() => goTab("briefing", true)}>Siden sidst {unread.length > 0 && <span className="unread-dot" />}</button>
        </nav>
        <div className="header-actions"><button className="feedback-link" onClick={() => setModal("feedback")}><MessageSquare size={16} /> Giv feedback</button><button className="button button-small" onClick={() => { setModal("signup"); setSignupError(""); }}>{token ? "Din tilmelding" : "Bliv betatester"}<ArrowUpRight size={15} /></button></div>
      </div>
      <nav className="mobile-tabs wrap" aria-label="Vælg overblik">{([["explore", "Udforsk"], ["following", `Mine (${reader.followed.length})`], ["briefing", `Siden sidst${unread.length ? ` (${unread.length})` : ""}`]] as [Tab, string][]).map(([key, label]) => <button key={key} className={tab === key ? "active" : ""} onClick={() => goTab(key, true)}>{label}</button>)}</nav>
    </header>

    <main>
      <section className="hero wrap">
        <div className="hero-copy">
          <p className="eyebrow"><span className="tiny-square" /> FØLG SPØRGSMÅLET TIL DØRS</p>
          <h1>Verden går videre.<br /><span>Det gør historien også.</span></h1>
          <p className="hero-description">Følg det, du vil forstå. Se, hvad ny viden ændrer.<br className="desktop-break" /> Få fortsættelsen, når der er noget at fortælle.</p>
          <div className="hero-buttons"><button className="text-button hero-explore" onClick={() => goTab("explore", true)}>Udforsk spørgsmål <ArrowRight size={17} /></button><button className="text-button" onClick={() => setModal("about")}>Sådan virker det <ChevronRight size={16} /></button></div>
        </div>
        <button className="example-brief" onClick={() => openStory("station-2028")} aria-label="Se eksemplet: Åbner den nye station i 2028?">
          <span className="example-top"><span><TrainFront size={16} /> TRANSPORT</span><span className="status-pill changed">{exampleStory.statusLabel}</span></span>
          <span className="example-title">Åbner den nye station i 2028?</span>
          <span className="example-comparison"><span><small>TIDLIGERE PLAN</small><strong>2028</strong></span><ArrowRight size={23} /><span><small>DET VED VI NU</small><strong>2030</strong></span></span>
          <span className="example-footer"><span><FileText size={14} /> {exampleStory.sources.length} fiktive dokumentuddrag</span><ArrowUpRight size={18} /></span>
        </button>
      </section>

      <section id="questions" ref={explorerRef} className="workspace wrap">
        <div className="section-heading"><div><p className="eyebrow">{tab === "explore" ? "HELE HISTORIEN. OGSÅ FORTSÆTTELSEN." : tab === "following" ? "DIT PERSONLIGE OVERBLIK" : "DET VÆSENTLIGE SIDEN SIDST"}</p><h2>{tab === "explore" ? "Historier, vi følger" : tab === "following" ? "Dine spørgsmål" : unread.length ? `${unread.length} ${unread.length === 1 ? "ting har" : "ting har"} ændret sig.` : "Du er ajour."}</h2></div><span className="edition-label">{tab === "explore" ? `${stories.length} eksempelsager` : `${followed.length} fulgte spørgsmål`}<span>PRØVEUDGAVE 0.2</span></span></div>
        <div className="demo-banner"><span className="demo-badge">EKSEMPELSAGER</span><p>Alle sager, steder og kilder er fiktive. Prøv oplevelsen, og fortæl os, hvad der virker.</p><button onClick={() => setModal("feedback")}>Giv feedback <ArrowUpRight size={14} /></button></div>
        {storageBlocked && <p className="form-error" role="status">Browseren tillader ikke at gemme dine valg. Du kan stadig prøve betaen, men valgene forsvinder, når siden lukkes.</p>}

        <div className="content-layout"><div className="main-column">
          {tab !== "briefing" && <>
            <div className="filter-row"><div className="filter-pills" aria-label="Filtrér efter emne">{["Alle emner", ...categories].map((item) => <button key={item} aria-pressed={category === item} className={category === item ? "selected" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div></div>
            <div className="search-row"><label className="search-input"><Search size={17} /><input aria-label="Søg i spørgsmål" placeholder="Søg efter et spørgsmål…" value={search} onChange={(event) => setSearch(event.target.value)} />{search && <button className="icon-button" aria-label="Ryd søgning" onClick={() => setSearch("")}><X size={15} /></button>}</label><label className="sort-control"><span className="sr-only">Sortering</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="recent">Senest opdateret</option><option value="alphabetical">Alfabetisk</option></select></label></div>
            {visible.length ? <div className="story-grid">{visible.map((story) => {
              const isFollowed = reader.followed.includes(story.id);
              const isNew = isFollowed && reader.seen[story.id] !== story.updatedAt;
              return <article className={`story-card ${story.correction ? "has-correction" : ""}`} key={story.id}>
                <div className="card-meta"><span className={`category-label category-${story.category.toLowerCase()}`}><CategoryIcon category={story.category} />{story.category}</span><span className={`status-pill ${story.status} ${story.correction ? "correction" : ""}`}>{isNew ? "Ny for dig" : story.statusLabel}</span></div>
                <h3><button onClick={() => openStory(story.id)}>{story.question}</button></h3>
                <div className="card-change"><span className="mini-rule" /><div><span className="micro-label">DET VED VI NU</span><p>{story.currentAnswer}</p></div></div>
                <div className="card-evidence"><button className="source-count" aria-label={`Se dokumentation: ${story.question}`} onClick={() => openStory(story.id, "sources")}><FileText size={15} />{story.sources.length} dokumentuddrag</button><button className="story-open" onClick={() => openStory(story.id)}>Se forløbet <ArrowRight size={16} /></button></div>
                <div className="card-footer"><span><Clock3 size={13} /> {shortDate(story.updatedAt)}</span><button className={`follow-button ${isFollowed ? "is-followed" : ""}`} aria-label={`${isFollowed ? "Stop med at følge" : "Følg"}: ${story.question}`} aria-pressed={isFollowed} onClick={() => toggleFollow(story)}>{isFollowed ? <Check size={15} /> : <Bookmark size={15} />}{isFollowed ? "Følger" : "Følg til afklaring"}</button></div>
              </article>;
            })}</div> : <div className="empty-state"><Bookmark size={32} /><h3>{tab === "following" && !followed.length ? "Dit første spørgsmål venter." : "Ingen spørgsmål matcher."}</h3><p>{tab === "following" && !followed.length ? "Find en sag, du er nysgerrig på, og vælg Følg til afklaring. Så samler vi fortsættelsen her." : "Prøv et andet søgeord eller vælg alle emner."}</p><button className="button" onClick={() => goTab("explore")}>{tab === "following" && !followed.length ? "Find et spørgsmål" : "Vis alle spørgsmål"}<ArrowRight size={16} /></button></div>}
          </>}
          {tab === "briefing" && <div className="briefing-list">
            {unread.length ? <><p className="section-intro">Her er den nye viden i de sager, du følger. Markér en opdatering som læst, når du er ajour.</p>{unread.map((story) => <article className="briefing-card" key={story.id}><div className="card-meta"><span className="category-label"><CategoryIcon category={story.category} />{story.category}</span><span className="status-pill changed">NY FOR DIG</span></div><h3>{story.question}</h3><div className="comparison"><div><span className="micro-label">SIDST FORTALTE VI DIG</span><p>{story.before}</p></div><div><span className="micro-label">DET VED VI NU</span><p>{story.after}</p></div></div><p className="briefing-uncertainty"><strong>Stadig uafklaret:</strong> {story.uncertainty}</p><div className="briefing-actions"><button className="text-button" onClick={() => openStory(story.id, "sources")}>Undersøg dokumentationen <ArrowRight size={16} /></button><button className="button button-small" onClick={() => markRead(story)}><CheckCheck size={16} /> Jeg er ajour</button></div></article>)}</> : <div className="empty-state caught-up"><div className="round-icon"><CheckCheck size={30} /></div><p className="eyebrow">DER ER RO PÅ</p><h3>{followed.length ? "Du har set det nye." : "En briefing, der ved, hvor du slap."}</h3><p>{followed.length ? `Du er ajour med de ${followed.length} spørgsmål, du følger. Næste opdatering kommer, når grundlaget ændrer sig.` : "Følg dit første spørgsmål, eller afspil en testopdatering for at se forskellen mellem før og nu."}</p><button className="button" onClick={simulate}><Play size={15} /> Afspil en testopdatering</button><span className="fine-print">Fiktivt forløb. Ingen beskeder bliver sendt.</span></div>}
          </div>}
        </div>

        <aside className="sidebar"><section className="overview-panel"><div className="panel-heading"><span>Dit overblik</span><Bookmark size={18} /></div><div className="overview-number">{reader.followed.length.toString().padStart(2, "0")}<span>{reader.followed.length === 1 ? "spørgsmål du følger" : "spørgsmål du følger"}</span></div><div className="overview-stat"><span><span className={`small-dot ${unread.length ? "orange" : "green"}`} /> Nye opdateringer</span><strong>{unread.length}</strong></div><button className="panel-link" onClick={() => goTab("briefing")}>Åbn din briefing <ArrowRight size={16} /></button><p className="panel-footnote">Dine valg huskes i denne browser.</p></section>
          <section className="milestone-panel"><p className="micro-label"><Clock3 size={14} /> NÆSTE HOLDEPUNKT</p>{upcoming ? <><span className="milestone-date">{shortDate(upcoming.nextMilestone.date!)}</span><h3>{upcoming.nextMilestone.label}</h3><button className="text-button" onClick={() => openStory(upcoming.id)}>Se sagen <ArrowUpRight size={15} /></button></> : <><h3>Vi holder øje med fortsættelsen.</h3><p>Følg et spørgsmål for at se, hvilken oplysning vi venter på.</p></>}</section>
          <section className="test-panel"><span className="test-label"><Play size={13} /> PRØV IDÉEN</span><h3>Hvad sker der, <br />når sagen ændrer sig?</h3><p>Spring frem i en eksempelsag. Se en ny opdatering lande i dit overblik.</p><button onClick={simulate}>{reader.simulated ? "Afspil prøven igen" : "Afspil en opdatering"}<ArrowRight size={16} /></button></section>
        </aside></div>
        <div className="end-note"><span /> <p>Du er nået til enden af prøveudgaven.</p><span /></div>
      </section>

      <section className="signup-band wrap"><div><p className="eyebrow">VÆR MED FRA BEGYNDELSEN</p><h2>Nysgerrig på fortsættelsen?</h2><p>Få besked, når vi begynder at følge rigtige sager.</p></div><button className="button button-cream" onClick={() => setModal("signup")}><Mail size={17} /> Tilmeld dig med email <ArrowRight size={17} /></button></section>
    </main>

    <footer className="site-footer wrap"><div><Logo /><p>Et spørgsmål fortjener en fortsættelse.</p></div><div className="footer-links"><button onClick={() => setModal("about")}>Om betaen</button><button onClick={() => setModal("privacy")}>Dine data og samtykke</button><button onClick={() => setModal("feedback")}>Giv feedback</button></div><span className="footer-version">BETA 0.2 · 2026</span></footer>
    {toast && <div className="toast" role="status"><Check size={17} />{toast}</div>}

    <Dialog open={!!selected} close={closeStory} title={selected?.question || "Eksempelsag"} wide>
      {selected && <><div className="detail-header"><div className="detail-meta"><span className="category-label"><CategoryIcon category={selected.category} />{selected.category}</span><span className="demo-badge">FIKTIV EKSEMPELSAG</span></div><h2>{selected.question}</h2><p className="detail-answer">{selected.currentAnswer}</p><div className="detail-actions"><span className={`status-pill ${selected.status}`}>{selected.statusLabel}</span><span className="detail-date">Opdateret {longDate(selected.updatedAt)}</span><button className={`follow-button ${reader.followed.includes(selected.id) ? "is-followed" : ""}`} onClick={() => toggleFollow(selected)}>{reader.followed.includes(selected.id) ? <Check size={15} /> : <Bookmark size={15} />}{reader.followed.includes(selected.id) ? "Følger" : "Følg til afklaring"}</button></div></div>
      <div className="detail-tabs" role="tablist" aria-label="Sagens indhold">{[["overview", "Hvad har ændret sig?"], ["timeline", "Tidslinje"], ["sources", `Dokumentation (${selected.sources.length})`]].map(([value, label]) => <button key={value} role="tab" aria-selected={detailTab === value} aria-controls={`panel-${value}`} id={`tab-${value}`} onClick={() => setDetailTab(value)} className={detailTab === value ? "active" : ""}>{label}</button>)}</div>
      <div className="detail-body" role="tabpanel" id={`panel-${detailTab}`} aria-labelledby={`tab-${detailTab}`}>
        {detailTab === "overview" && <>{selected.correction && <div className="correction-box"><span className="micro-label">VI RETTER VORES TIDLIGERE OPLYSNING</span><h3>Vi gjorde konklusionen for bred.</h3><p>{selected.correction.reason}</p></div>}<div className="comparison"><div><span className="micro-label">SIDST FORTALTE VI DIG</span><p>{selected.before}</p></div><div><span className="micro-label">DET VED VI NU</span><p>{selected.after}</p></div></div><div className="detail-two-col"><section><h3>Derfor betyder det noget</h3><p>{selected.whyItMatters}</p></section><section><h3>Det er stadig uafklaret</h3><p>{selected.uncertainty}</p></section></div><div className="next-milestone"><Clock3 size={20} /><div><span className="micro-label">{selected.status === "resolved" ? "FORLØBET ER AFKLARET" : "DET FØLGER VI NU"}</span><p>{selected.nextMilestone.label}</p></div>{selected.nextMilestone.date && <span>{longDate(selected.nextMilestone.date)}</span>}</div><button className="text-button" onClick={() => setDetailTab("sources")}>Se, hvad opdateringen bygger på <ArrowRight size={16} /></button></>}
        {detailTab === "timeline" && <div className="full-timeline">{selected.timeline.map((entry, index) => <section key={`${entry.date}-${index}`} className={entry.kind === "correction" ? "correction" : ""}><span className="timeline-node" /><time>{longDate(entry.date)}</time><h3>{entry.title}</h3><p>{entry.body}</p></section>)}</div>}
        {detailTab === "sources" && <><p className="source-notice"><FileText size={18} /> Disse dokumentuddrag er skrevet til betaen. De er fiktive og kan ikke bruges som faktiske kilder.</p><div className="source-list">{selected.sources.map((source, index) => <article key={source.title}><div className="source-top"><span className="source-number">{String(index + 1).padStart(2, "0")}</span><span>{longDate(source.date)}</span></div><h3>{source.title}</h3><p className="source-publisher">{source.publisher}</p><blockquote>{source.excerpt}</blockquote></article>)}</div></>}
      </div><div className="detail-bottom"><button className="text-button" onClick={() => copy(`${location.origin}${location.pathname}?sag=${selected.id}`, "Linket til eksempelsagen er kopieret.")}><Copy size={15} /> Kopiér link</button><button className="button button-small" onClick={() => { markRead(selected); closeStory(); }}><CheckCheck size={16} /> Jeg er ajour</button></div></>}
    </Dialog>

    <Dialog open={modal === "signup"} close={() => setModal(null)} title="Tilmeld dig betaen">
      <div className="form-modal"><span className="modal-icon"><Mail size={25} /></span><p className="eyebrow">VÆR MED FRA BEGYNDELSEN</p>
        {signupDone || token ? <><h2>Din tilmelding er modtaget.</h2><p>Du kan fortsætte med at prøve betaen. Der udsendes endnu ingen automatiske emails.</p><div className="success-note"><Check size={18} /><span>En eksisterende tilmelding til samme email ændres ikke.</span></div><p className="fine-print">Koden gælder kun en ny tilmelding oprettet her. En tidligere tilmelding kræver den oprindelige kode. Gem koden, så du også kan slette i en anden browser.</p><details className="token-details"><summary>Vis og kopiér slettekode</summary><code>{token}</code><button className="text-button" onClick={() => copy(token, "Slettekoden er kopieret.")}><Copy size={15} /> Kopiér kode</button></details><button className="button full-width" onClick={() => { setModal(null); goTab("explore", true); }}>Fortsæt til spørgsmålene <ArrowRight size={17} /></button><button className="text-button centered" onClick={() => setModal("privacy")}>Administrér din tilmelding</button><details className="alternate-email"><summary>Vil du bruge en anden email?</summary><p className="fine-print">Gem koden ovenfor først. Din tidligere tilmelding bliver stående, når du åbner formularen igen.</p><button className="text-button" onClick={() => { setToken(""); setSignupDone(false); setEmail(""); signupAttempt.current = null; try { localStorage.removeItem(TOKEN_KEY); } catch {} }}>Åbn en ny tilmelding <ArrowRight size={14} /></button></details></> : <><h2>Følg med,<br /><em>når vi går live.</em></h2><p>Få besked, når Siden sidst begynder at følge rigtige sager. Du kan prøve betaen allerede nu.</p><form onSubmit={signup}><label className="field-label" htmlFor="signup-email">Din email</label><input className="form-input" type="email" id="signup-email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="dig@eksempel.dk" required maxLength={254} autoComplete="email" /><div className="honeypot" aria-hidden="true"><label>Website<input type="text" name="website" tabIndex={-1} autoComplete="off" /></label></div><label className="checkbox-label"><input type="checkbox" name="consent" required /><span>Ja, Siden sidst må gemme min email og kontakte mig om betaen.</span></label>{reader.followed.length > 0 && <p className="fine-print">Dine {reader.followed.length} valgte spørgsmål gemmes som interesseområder sammen med tilmeldingen.</p>}{signupError && <p className="form-error" role="alert">{signupError}</p>}<button type="submit" className="button full-width" disabled={signupBusy}>{signupBusy ? "Gemmer tilmelding…" : "Tilmeld mig betaen"}<ArrowRight size={17} /></button><p className="form-note">Ingen adgangskode. Ingen automatiske emails endnu.</p></form><button className="text-button centered" onClick={() => setModal("privacy")}>Læs om data og samtykke <ArrowUpRight size={14} /></button></>}
      </div>
    </Dialog>

    <Dialog open={modal === "feedback"} close={() => setModal(null)} title="Giv feedback på betaen">
      <div className="form-modal"><span className="modal-icon"><MessageSquare size={25} /></span><p className="eyebrow">HJÆLP OS MED NÆSTE VERSION</p>{feedbackDone ? <><h2>Tak for dit blik på betaen.</h2><p>Din feedback er gemt. Den hjælper med at vælge, hvad vi skal forbedre først.</p><button className="button full-width" onClick={() => setModal(null)}>Tilbage til Siden sidst <ArrowRight size={17} /></button></> : <><h2>Hvad virkede for dig?</h2><p>Tre korte spørgsmål. Feedbacken gemmes uden din email.</p><form onSubmit={sendFeedback}><fieldset className="rating-field"><legend>Var det tydeligt, hvad der havde ændret sig?</legend><div className="rating-options">{[1, 2, 3, 4, 5].map((value) => <label key={value} className={clarity === value ? "chosen" : ""}><input required type="radio" name="clarity" value={value} checked={clarity === value} onChange={() => setClarity(value)} /><span>{value}</span></label>)}</div><div className="rating-scale"><span>Meget uklart</span><span>Meget tydeligt</span></div></fieldset><fieldset className="return-field"><legend>Ville du vende tilbage for at følge en sag?</legend><div className="return-options">{[["yes", "Ja"], ["maybe", "Måske"], ["no", "Nej"]].map(([value, label]) => <label key={value} className={wouldReturn === value ? "chosen" : ""}><input required type="radio" name="return" value={value} checked={wouldReturn === value} onChange={() => setWouldReturn(value)} /><span>{label}</span></label>)}</div></fieldset><label className="field-label" htmlFor="comment">Hvad manglede du for at stole på opdateringen? <span>(valgfrit)</span></label><textarea id="comment" className="form-input" rows={4} maxLength={1500} placeholder="En bestemt kilde, mere baggrund, en funktion…" value={comment} onChange={(event) => setComment(event.target.value)} /><span className="character-count">{comment.length} / 1.500</span><div className="honeypot" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>{feedbackError && <p className="form-error" role="alert">{feedbackError}</p>}<button className="button full-width" type="submit" disabled={feedbackBusy}>{feedbackBusy ? "Gemmer feedback…" : "Send min feedback"}<ArrowRight size={17} /></button></form></>}
      </div>
    </Dialog>

    <Dialog open={modal === "privacy"} close={() => setModal(null)} title="Dine data og samtykke">
      <div className="form-modal privacy-content"><span className="modal-icon"><ShieldCheck size={25} /></span><p className="eyebrow">DU BESTEMMER</p><h2>Dine data.</h2><h3>Når du prøver betaen</h3><p>Dine fulgte spørgsmål, læsestatus og testopdateringer huskes i denne browser. De synkroniseres ikke mellem enheder. Vi bruger ingen annonce- eller analysetrackere.</p><h3>Når du tilmelder dig</h3><p>Vi gemmer din email, dit samtykke med dato og eventuelle valgte interesseområder. Emailen vises ikke offentligt. Tilmeldingen er en venteliste til betaen, og adressen er endnu ikke verificeret. Der udsendes ingen automatiske emails i denne version.</p><h3>Feedback</h3><p>Vi gemmer dine svar og din kommentar uden at knytte dem til emailtilmeldingen. Undlad private oplysninger i kommentaren. Korte misbrugstællere beskytter formularerne; rå IP-adresser gemmes ikke i tilmeldingslisten.</p><div className="data-section"><h3>Træk din tilmelding tilbage</h3><p>Brug slettekoden fra din oprindelige tilmelding. Koden huskes i den browser, hvor du tilmeldte dig.</p><label className="field-label" htmlFor="delete-code">Din slettekode</label><input id="delete-code" className="form-input code-input" value={deleteCode} onChange={(event) => { setDeleteCode(event.target.value); setConfirmDelete(false); }} placeholder="Indsæt din kode" autoComplete="off" maxLength={64} />{token && <button className="text-button" onClick={() => copy(token, "Slettekoden er kopieret.")}><Copy size={14} /> Kopiér min kode</button>}{dataError && <p className="form-error" role="alert">{dataError}</p>}{dataMessage && <p className="success-note" role="status"><Check size={17} />{dataMessage}</p>}{confirmDelete ? <div className="confirm-row"><p>Skal din email og tilmelding slettes?</p><button className="button button-danger button-small" onClick={removeRegistration} disabled={deleteBusy}>{deleteBusy ? "Sletter…" : "Ja, slet tilmeldingen"}</button><button className="text-button" onClick={() => setConfirmDelete(false)}>Fortryd</button></div> : <button className="button button-outline full-width" disabled={deleteCode.trim().length !== 64} onClick={() => setConfirmDelete(true)}><Trash2 size={16} /> Slet min tilmelding</button>}</div><div className="data-section"><h3>Nulstil prøveoplevelsen</h3><p>Fjerner dine fulgte eksempelsager og læsestatus fra denne browser. Emailtilmeldingen administreres ovenfor.</p>{confirmReset ? <div className="confirm-row"><button className="button button-small" onClick={() => { setReader(EMPTY); setConfirmReset(false); setToast("Prøveoplevelsen er nulstillet."); }}>Ja, nulstil prøveoplevelsen</button><button className="text-button" onClick={() => setConfirmReset(false)}>Fortryd</button></div> : <button className="text-button" onClick={() => setConfirmReset(true)}><RotateCcw size={15} /> Nulstil mine valg</button>}</div></div>
    </Dialog>

    <Dialog open={modal === "about"} close={() => setModal(null)} title="Sådan virker Siden sidst">
      <div className="form-modal about-content"><p className="eyebrow">ET SPØRGSMÅL FORTJENER EN FORTSÆTTELSE</p><h2>Hold fast<br /><em>i historien.</em></h2><p>Siden sidst er en idé til et nyhedsmedie, der følger spørgsmål frem til afklaring.</p><ol><li><span>01</span><div><h3>Vælg det, du vil forstå</h3><p>Følg et konkret spørgsmål. Vi samler forløbet i dit overblik.</p></div></li><li><span>02</span><div><h3>Se den faktiske ændring</h3><p>Hver opdatering viser før, nu, dokumentation og det, vi stadig ikke ved.</p></div></li><li><span>03</span><div><h3>Få fortsættelsen med</h3><p>Vi følger milepæle, retter fejl og afslutter sagen, når spørgsmålet er afklaret.</p></div></li></ol><div className="about-beta"><strong>Du prøver beta 0.2</strong><p>Seks fiktive sager, gemte valg i din browser og en testopdatering, du selv kan afspille. Emailtilmelding og feedback gemmes rigtigt. Rigtige nyhedsopdateringer og emailudsendelser kommer først i en senere version.</p></div><button className="button full-width" onClick={() => { setModal(null); simulate(); }}><Play size={15} /> Oplev en opdatering</button></div>
    </Dialog>
  </>;
}
