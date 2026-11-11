"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUpRight, Bell, BookOpen, Check, CheckCheck, ChevronDown, Clock3, Copy, FileText, Globe2, History, Info, MapPin, MessageSquare, Pause, Play, Plus, RefreshCw, Search, Settings2, ShieldCheck, Sparkles, Star, Upload, X } from "lucide-react";
import { Feedback, Membership } from "./news-membership";
import { CASE_KIND_LABELS, CASE_STATUS_LABELS, type CaseProgress, type CaseReader, type CaseSource, type CaseUpdate, type CasesResponse, type TrackedCase } from "./lib/case-types";
import { acknowledgeCase, CASE_CACHE_KEY, CASE_READER_KEY, caseNeedsAttention, caseNewUpdates, caseProfileExport, caseProfileImport, caseUpdateAt, followCase, latestCaseUpdate, markCaseOpened, markCaseShown, MAX_FOLLOWED_CASES, normalizeCaseReader, parseCasesResponse, setCaseOptions, unfollowCase } from "./lib/case-reader";
import { REGIONS, TOPICS } from "./lib/news-types";

type CaseView = "updates" | "mine" | "discover";
type Modal = "settings" | "method" | "signup" | "feedback" | null;
type Selection = { item: TrackedCase; beforeRevision: number };
const IMAGE_FILES = { city: "nordic-city.webp", climate: "nordic-climate.webp", mobility: "nordic-mobility.webp" };
const dateLabel = (value: string | null, time = false) => value ? new Intl.DateTimeFormat("da-DK", { day: "numeric", month: "short", year: "numeric", ...(time ? { hour: "2-digit", minute: "2-digit" } : {}), timeZone: "Europe/Copenhagen" }).format(new Date(value)) : "Dato ikke oplyst";
const regionLabel = (value: string) => REGIONS.find(region => region.id === value)?.label || value;
const topicLabel = (value: string) => TOPICS.find(topic => topic.id === value)?.label || value;
const checkLabels = { checked: "Kilder gennemgået", partial: "Delvis kildekontrol", unavailable: "Kildekontrol mangler", pending_review: "Afventer gennemgang" };

function Wordmark() { return <span className="n-wordmark"><span className="n-brand-mark" aria-hidden="true"><i/><i/><i/><b/></span>Siden sidst<span>.</span></span>; }

function Dialog({ open, title, close, children, wide = false }: { open: boolean; title: string; close: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current; if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    if (!open) return;
    const previous = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);
  return <dialog ref={ref} aria-label={title} className={`c-dialog ${wide ? "c-dialog-wide" : ""}`} onCancel={close} onClick={event => { if (event.target === event.currentTarget) close(); }}><div className="c-dialog-top"><span><Wordmark/><span className="n-beta-tag">BETA 0.4</span></span><button className="n-icon-button" onClick={close} aria-label="Luk vindue"><X size={21}/></button></div><div className="c-dialog-content">{children}</div></dialog>;
}

function SourceLinks({ item, ids }: { item: TrackedCase; ids: string[] }) {
  const sources = ids.map(id => item.sources.find(source => source.id === id)).filter((source): source is CaseSource => !!source);
  return <div className="c-source-links">{sources.map(source => <a key={source.id} href={source.url} target="_blank" rel="noopener noreferrer" title={source.title}>{source.publisher}<ArrowUpRight size={12}/></a>)}</div>;
}

function CheckStatus({ item }: { item: TrackedCase }) {
  const check = item.lastCheck;
  return <div className={`c-check-status ${check && check.status !== "checked" ? "c-check-incomplete" : ""}`}><ShieldCheck size={14}/><div><span>{check ? checkLabels[check.status] : "Ingen registreret kildekontrol"}</span>{check && <time dateTime={check.checkedAt}>{dateLabel(check.checkedAt)}</time>}</div></div>;
}

function CaseCard({ item, progress, beforeRevision, assets, viewBlocked, onOpen, onFollow, onPriority, onShown }: { item: TrackedCase; progress?: CaseProgress; beforeRevision: number; assets: string; viewBlocked: boolean; onOpen: (item: TrackedCase) => void; onFollow: (item: TrackedCase) => void; onPriority: (id: string, high: boolean) => void; onShown: (item: TrackedCase, revision: number) => void }) {
  const ref = useRef<HTMLElement>(null);
  const latest = latestCaseUpdate(item), changes = caseNewUpdates(item, progress);
  const before = caseUpdateAt(item, beforeRevision);
  const corrections = changes.filter(update => update.kind === "correction");
  useEffect(() => {
    const element = ref.current;
    if (!element || !progress || viewBlocked || typeof IntersectionObserver === "undefined") return;
    let timer: ReturnType<typeof setTimeout> | undefined, sent = false, intersecting = false;
    function schedule() {
      clearTimeout(timer);
      if (!sent && intersecting && document.visibilityState === "visible") timer = setTimeout(() => {
        if (document.visibilityState === "visible") { sent = true; onShown(item, latest.revision); observer.disconnect(); }
      }, 600);
    }
    const observer = new IntersectionObserver(entries => { intersecting = entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= .25); schedule(); }, { threshold: [.25] });
    observer.observe(element);
    document.addEventListener("visibilitychange", schedule);
    return () => { observer.disconnect(); clearTimeout(timer); document.removeEventListener("visibilitychange", schedule); };
  }, [item, latest.revision, !!progress, viewBlocked, onShown]);
  const badge = progress?.paused ? "På pause" : !progress ? CASE_STATUS_LABELS[latest.snapshot.status] : corrections.length ? "Rettelse siden sidst" : changes.length ? `${changes.length} ${changes.length === 1 ? "ny udvikling" : "nye udviklinger"}` : !progress.acknowledgedRevision ? "Dit første overblik" : "Du er ajour";
  return <article ref={ref} className={`c-card ${progress ? "c-card-followed" : ""} ${progress?.paused ? "c-card-paused" : ""}`}>
    <div className="c-card-media"><img src={`${assets}media/${IMAGE_FILES[item.imageKey]}`} alt="" loading="lazy"/><span className="c-card-region">{item.scope === "global" ? <Globe2 size={12}/> : <MapPin size={12}/>} {regionLabel(item.region)}</span><span className="c-illustration">Emneillustration</span>{progress && <button className={`c-priority ${progress.priority === "high" ? "selected" : ""}`} aria-label={`${progress.priority === "high" ? "Fjern prioritet" : "Prioritér"}: ${item.question}`} aria-pressed={progress.priority === "high"} onClick={() => onPriority(item.id, progress.priority !== "high")}><Star size={16} fill={progress.priority === "high" ? "currentColor" : "none"}/></button>}</div>
    <div className="c-card-content"><div className="c-card-topline"><span>{topicLabel(item.topics[0])}</span><span className={`c-state ${changes.length ? "c-state-new" : ""} ${corrections.length ? "c-state-correction" : ""}`}>{progress?.paused ? <Pause size={11}/> : progress?.acknowledgedRevision === latest.revision ? <Check size={11}/> : null}{badge}</span></div><h3><button onClick={() => onOpen(item)}>{item.question}</button></h3>
      {progress && before && before.revision < latest.revision ? <div className="c-card-before"><span>Sidst viste vi dig</span><p>{before.snapshot.answer}</p></div> : null}
      <div className="c-card-answer"><span className="c-micro-label">{changes.length ? "DET HAR ÆNDRET SIG" : "HVOR STÅR SAGEN?"}</span><p>{changes.length ? changes[changes.length - 1].change : latest.snapshot.answer}</p></div>
      <div className="c-card-next"><Clock3 size={15}/><div><span>{latest.snapshot.status === "resolved" ? "Efter afklaringen" : "Det følger vi op på"}</span><p>{latest.snapshot.nextStep.label}</p>{latest.snapshot.nextStep.expectedAt && <time dateTime={latest.snapshot.nextStep.expectedAt}>{dateLabel(latest.snapshot.nextStep.expectedAt)} · annonceret tidspunkt</time>}</div></div>
      <div className="c-card-provenance"><CheckStatus item={item}/><span>{item.sources.length} {item.sources.length === 1 ? "kilde" : "kilder"}</span></div>
    </div>
    <div className="c-card-actions"><button className="c-read-case" onClick={() => onOpen(item)}>{progress ? "Se fortsættelsen" : "Se sagens forløb"}<ArrowRight size={15}/></button><button className={`c-follow ${progress ? "following" : ""}`} onClick={() => onFollow(item)} aria-label={`${progress ? "Stop med at følge" : "Følg sagen"}: ${item.question}`} aria-pressed={!!progress}>{progress ? <Check size={14}/> : <Plus size={15}/>} {progress ? "Følger" : "Følg sagen"}</button></div>
  </article>;
}

export default function CaseApp({ basePath, apiOrigin, onNewsFeed }: { basePath: string; apiOrigin: string; onNewsFeed: () => void }) {
  const assets = basePath.endsWith("/") ? basePath : `${basePath}/`, api = apiOrigin.replace(/\/$/, "");
  const [reader, setReader] = useState<CaseReader>({ version: 1, cases: {} });
  const [ready, setReady] = useState(false), [storageBlocked, setStorageBlocked] = useState(false);
  const [data, setData] = useState<CasesResponse | null>(null), [loading, setLoading] = useState(true), [refreshing, setRefreshing] = useState(false), [error, setError] = useState("");
  const [fromCache, setFromCache] = useState(false), [view, setView] = useState<CaseView>("discover");
  const [query, setQuery] = useState(""), [scope, setScope] = useState("all"), [topic, setTopic] = useState("all"), [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<Selection | null>(null), [modal, setModal] = useState<Modal>(null);
  const [toast, setToast] = useState(""), [importError, setImportError] = useState(""), [confirmReset, setConfirmReset] = useState(false), [missingLink, setMissingLink] = useState(false);
  const beforeVisit = useRef<Record<string, CaseProgress>>({}), handledLink = useRef(false), request = useRef<AbortController | null>(null), fileInput = useRef<HTMLInputElement>(null);
  const cases = data?.cases || [];
  const followed = useMemo(() => cases.filter(item => Object.hasOwn(reader.cases, item.id)), [cases, reader]);
  const attention = useMemo(() => followed.filter(item => caseNeedsAttention(item, reader.cases[item.id])), [followed, reader]);
  const changed = useMemo(() => followed.filter(item => caseNewUpdates(item, reader.cases[item.id]).length), [followed, reader]);
  const active = followed.filter(item => !reader.cases[item.id].paused);
  const paused = followed.filter(item => reader.cases[item.id].paused);
  const noFollowed = !Object.keys(reader.cases).length;

  useEffect(() => {
    try {
      const restored = normalizeCaseReader(JSON.parse(localStorage.getItem(CASE_READER_KEY) || "null"));
      beforeVisit.current = restored.cases; setReader(restored); setView(Object.keys(restored.cases).length ? "updates" : "discover");
      const cachedString = localStorage.getItem(CASE_CACHE_KEY);
      const cached = cachedString && cachedString.length < 4_000_000 ? parseCasesResponse(JSON.parse(cachedString)) : null;
      if (cached) { setData(cached); setFromCache(true); }
    } catch { setStorageBlocked(true); }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) try { localStorage.setItem(CASE_READER_KEY, JSON.stringify(reader)); } catch { setStorageBlocked(true); } }, [ready, reader]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(""), 5500); return () => clearTimeout(timer); }, [toast]);

  const refresh = useCallback(async () => {
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    setRefreshing(true); setError("");
    try {
      const response = await fetch(`${api}/api/cases`, { credentials: "omit", signal: controller.signal });
      if (!response.ok) throw new Error("Sagsoversigten kunne ikke opdateres lige nu.");
      const parsed = parseCasesResponse(await response.json());
      if (!parsed) throw new Error("Sagsoversigten kunne ikke læses. Prøv igen om lidt.");
      setData(parsed); setFromCache(false);
      try { localStorage.setItem(CASE_CACHE_KEY, JSON.stringify(parsed)); } catch {}
    } catch (failure) { if (!controller.signal.aborted) { setError(failure instanceof Error ? failure.message : "Forbindelsen blev afbrudt."); setFromCache(true); } }
    finally { if (!controller.signal.aborted) { setLoading(false); setRefreshing(false); } }
  }, [api]);
  useEffect(() => { void refresh(); const interval = setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 10 * 60 * 1000); return () => { request.current?.abort(); clearInterval(interval); }; }, [refresh]);

  const shown = useCallback((item: TrackedCase, revision: number) => setReader(previous => markCaseShown(previous, item, revision)), []);
  function openCase(item: TrackedCase) {
    setSelected({ item, beforeRevision: beforeVisit.current[item.id]?.seenRevision || 0 });
    setReader(previous => markCaseOpened(previous, item, latestCaseUpdate(item).revision));
    const url = new URL(location.href); url.searchParams.delete("artikel"); url.searchParams.set("sag", item.id); url.hash = "";
    history.replaceState(null, "", url.pathname + url.search);
  }
  function closeCase() {
    setSelected(null); const url = new URL(location.href); url.searchParams.delete("sag"); history.replaceState(null, "", url.pathname + url.search + url.hash);
  }
  useEffect(() => {
    if (!ready || !data || handledLink.current) return;
    const caseId = new URLSearchParams(location.search).get("sag");
    if (!caseId) { handledLink.current = true; return; }
    const item = data.cases.find(entry => entry.id === caseId);
    if (!item && (fromCache || loading)) return;
    handledLink.current = true;
    if (item) openCase(item); else setMissingLink(true);
  }, [ready, data, fromCache, loading]);
  useEffect(() => {
    function onPop() { const id = new URLSearchParams(location.search).get("sag"); const item = data?.cases.find(entry => entry.id === id); if (item) openCase(item); else setSelected(null); }
    window.addEventListener("popstate", onPop); return () => window.removeEventListener("popstate", onPop);
  }, [data]);

  function toggleFollow(item: TrackedCase) {
    const already = Object.hasOwn(reader.cases, item.id);
    if (!already && Object.keys(reader.cases).length >= MAX_FOLLOWED_CASES) { setToast("Du følger 100 sager. Fjern en, før du tilføjer flere."); return; }
    setReader(previous => {
      if (Object.hasOwn(previous.cases, item.id)) return unfollowCase(previous, item.id);
      const next = followCase(previous, item); return selected?.item.id === item.id ? markCaseOpened(next, item, latestCaseUpdate(selected.item).revision) : next;
    });
    setToast(already ? "Du følger ikke længere sagen. Historikken er stadig tilgængelig." : "Du følger sagen. Dit valg huskes i denne browser.");
  }
  function prioritize(caseId: string, high: boolean) { setReader(previous => setCaseOptions(previous, caseId, { priority: high ? "high" : "normal" })); setToast(high ? "Sagen er prioriteret i dit overblik." : "Sagen har normal prioritet igen."); }
  function pause(caseId: string, value: boolean) { setReader(previous => setCaseOptions(previous, caseId, { paused: value })); setToast(value ? "Sagen er sat på pause. Du finder den stadig under Mine sager." : "Opfølgningen er aktiv igen. Din læseposition er bevaret."); }
  function acknowledge(item: TrackedCase) { setReader(previous => acknowledgeCase(previous, item, latestCaseUpdate(item).revision)); setToast("Du er ajour med denne version. Nye ændringer bliver vist næste gang."); }
  function navigate(next: CaseView) { setView(next); setQuery(""); setScope("all"); setTopic("all"); setStatus("all"); document.getElementById("sager")?.scrollIntoView({ behavior: "smooth", block: "start" }); }
  function exportProfile() {
    const blob = new Blob([JSON.stringify(caseProfileExport(reader), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob), link = document.createElement("a"); link.href = url; link.download = "siden-sidst-mine-sager.json"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); setToast("Dine sager og læsepositioner er eksporteret uden email eller tilmeldingskode.");
  }
  async function importProfile(file: File) {
    setImportError("");
    try {
      if (file.size > 200_000) throw new Error("Filen er for stor. Vælg en sagseksport fra Siden sidst.");
      const next = caseProfileImport(JSON.parse(await file.text()), cases); beforeVisit.current = next.cases; setReader(next); setToast("Dine sager og læsepositioner er importeret."); setConfirmReset(false);
    } catch (failure) { setImportError(failure instanceof Error ? failure.message : "Filen kunne ikke læses."); }
    finally { if (fileInput.current) fileInput.current.value = ""; }
  }
  async function copyCase(item: TrackedCase) { const url = new URL(location.href); url.searchParams.delete("artikel"); url.searchParams.set("sag", item.id); url.hash = ""; try { await navigator.clipboard.writeText(url.toString()); setToast("Linket til sagen er kopieret."); } catch { setToast("Kopiér linket fra browserens adresselinje."); } }

  const visible = useMemo(() => {
    const collection = view === "discover" ? cases : view === "mine" ? followed : attention;
    const search = query.trim().toLocaleLowerCase("da");
    return collection.filter(item => {
      const progress = reader.cases[item.id], latest = latestCaseUpdate(item);
      return (scope === "all" || (scope === "local" ? item.scope !== "global" : item.scope === "global")) && (topic === "all" || item.topics.includes(topic as typeof item.topics[number])) && (status === "all" || status === "paused" && !!progress?.paused || status === "active" && !progress?.paused && latest.snapshot.status !== "resolved" || status === "resolved" && latest.snapshot.status === "resolved") && (!search || `${item.question} ${item.description} ${latest.snapshot.answer} ${item.sources.map(source => source.publisher).join(" ")}`.toLocaleLowerCase("da").includes(search));
    }).sort((a, b) => {
      if (view === "discover") return 0;
      const ap = reader.cases[a.id], bp = reader.cases[b.id];
      return Number(bp?.priority === "high") - Number(ap?.priority === "high") || Number(caseNeedsAttention(b, bp)) - Number(caseNeedsAttention(a, ap)) || Date.parse(latestCaseUpdate(b).recordedAt) - Date.parse(latestCaseUpdate(a).recordedAt);
    });
  }, [cases, followed, attention, view, query, scope, topic, status, reader]);
  const upcoming = active.filter(item => latestCaseUpdate(item).snapshot.status !== "resolved").sort((a, b) => (Date.parse(latestCaseUpdate(a).snapshot.nextStep.expectedAt || "") || Infinity) - (Date.parse(latestCaseUpdate(b).snapshot.nextStep.expectedAt || "") || Infinity)).slice(0, 3);
  const detail = selected?.item, detailLatest = detail ? latestCaseUpdate(detail) : null, detailProgress = detail ? reader.cases[detail.id] : undefined;
  const detailBefore = detail && selected ? caseUpdateAt(detail, selected.beforeRevision) : undefined;
  const detailChanges = detail ? caseNewUpdates(detail, detailProgress) : [];
  const newerDetail = detail ? cases.find(item => item.id === detail.id && latestCaseUpdate(item).revision > (detailLatest?.revision || 0)) : undefined;
  const hasFilters = !!query || scope !== "all" || topic !== "all" || status !== "all";

  return <div className="c-app"><a className="n-skip" href="#sager">Gå til dine sager</a><div className="c-utility"><div className="n-wrap"><span>NYHEDER MED HUKOMMELSE</span><button onClick={() => setModal("method")}>Sådan følger vi op <ArrowUpRight size={12}/></button></div></div>
    <header className="c-header"><div className="n-wrap c-header-row"><button className="n-logo-button" aria-label="Siden sidst, forside" onClick={() => { setView(noFollowed ? "discover" : "updates"); window.scrollTo({ top: 0, behavior: "smooth" }); }}><Wordmark/><span className="n-beta-tag">BETA</span></button><nav aria-label="Hovednavigation" className="c-nav">{([["updates", "Siden sidst"], ["mine", "Mine sager"], ["discover", "Opdag"]] as [CaseView,string][]).map(([key, label]) => <button key={key} aria-current={view === key ? "page" : undefined} className={view === key ? "active" : ""} onClick={() => navigate(key)}>{label}{key === "updates" && changed.length > 0 && <span>{changed.length}</span>}</button>)}</nav><div className="c-header-actions"><button className="n-icon-button" aria-label="Indstillinger og mine data" onClick={() => setModal("settings")}><Settings2 size={19}/></button><button className="c-news-link" onClick={onNewsFeed}>Nyhedsfeed <ArrowUpRight size={14}/></button></div></div></header>

    <main className="n-wrap c-main">
      <section className={`c-hero ${noFollowed ? "" : "c-hero-returning"}`} aria-label="Nyheder med hukommelse"><div className="c-hero-image"><img src={`${assets}media/nordic-mobility.webp`} alt="Emneillustration af et tog ved en nordisk station"/><div className="c-hero-copy"><span className="c-eyebrow">ET SPØRGSMÅL FORTJENER EN FORTSÆTTELSE</span><h1>{noFollowed ? <>Vi husker historien.<br/>Du får fortsættelsen.</> : <>Her fortsætter<br/>dine sager.</>}</h1><p>{noFollowed ? "Følg det, du gerne vil have svar på. Vi samler udviklingen, husker hvor du slap og holder fast i de åbne spørgsmål." : "Det, der har ændret sig. Det, der mangler svar. Og det næste skridt i de sager, du følger."}</p><button className="n-button n-button-light" onClick={() => navigate(noFollowed ? "discover" : "updates")}>{noFollowed ? "Find din første sag" : "Se mit overblik"}<ArrowRight size={16}/></button></div><span className="c-hero-credit">Genereret emneillustration</span></div><div className="c-hero-note">{noFollowed ? <><div className="c-note-icon"><History size={24}/></div><span className="c-eyebrow">DU KAN GODT KIGGE VÆK LIDT</span><h2>Vi holder fast<br/>i tråden.</h2><ol><li><span>01</span><p><strong>Vælg en sag</strong>Et spørgsmål, der betyder noget for dig.</p></li><li><span>02</span><p><strong>Se, hvad der ændrer sig</strong>Med historik, dokumentation og forbehold.</p></li><li><span>03</span><p><strong>Få næste skridt med</strong>{data?.monitoring.state === "scheduled" ? "Vi følger sagen videre, mens du er væk." : "Se næste skridt og seneste kildekontrol."}</p></li></ol><button className="n-text-button" onClick={() => setModal("method")}>Mød ideen bag <ArrowRight size={14}/></button></> : <><span className="c-eyebrow">DIT PERSONLIGE OVERBLIK</span><div className="c-hero-number">{changed.length.toString().padStart(2, "0")}<span>sager med ny udvikling</span></div><div className="c-return-stats"><div><strong>{followed.length}</strong><span>sager, du følger</span></div><div><strong>{paused.length}</strong><span>sat på pause</span></div></div><p>Et besøg gør dig ikke automatisk ajour. Du bestemmer, hvornår du er med.</p><button className="n-text-button" onClick={() => navigate("mine")}>Se alle mine sager <ArrowRight size={14}/></button></>}</div></section>

      <section id="sager" className="c-cases-section"><div className="c-section-heading"><div><span className="c-eyebrow">{view === "discover" ? "FRA DIN BY TIL RESTEN AF VERDEN" : view === "mine" ? "DET, DU HAR VALGT AT FØLGE" : "VI FORTSÆTTER, HVOR DU SLAP"}</span><h2>{view === "discover" ? "Hvilket spørgsmål vil du følge?" : view === "mine" ? "Mine sager." : "Dit overblik siden sidst."}</h2><p>{view === "discover" ? "Virkelige sager. Dokumenterede forløb. Vælg dem, du vil have fortsættelsen på." : view === "mine" ? "Prioritér, sæt på pause og find tilbage til hele forløbet." : "Nye udviklinger og sager, du endnu ikke har gennemgået."}</p></div><button className="c-refresh" onClick={() => void refresh()} disabled={refreshing}><RefreshCw size={14} className={refreshing ? "c-spinning" : ""}/>{refreshing ? "Henter…" : "Opdatér overblik"}</button></div>

        {(error || storageBlocked || fromCache || data?.storage === "catalog" || missingLink) && <div className="c-notices" role="status">{error && <p><Info size={16}/><span>{error} {data ? "Du ser det senest gemte overblik med de oprindelige datoer." : "Prøv at opdatere igen."}</span></p>}{fromCache && !error && <p><Clock3 size={16}/><span>Et tidligere gemt overblik vises, mens vi henter sagerne.</span></p>}{data?.storage === "catalog" && !fromCache && <p><Info size={16}/><span>Viser det kontrollerede startkatalog. Den løbende historik er ikke tilgængelig lige nu.</span></p>}{storageBlocked && <p><ShieldCheck size={16}/><span>Browseren tillader ikke lokal lagring. Eksportér dine valg for at gemme dem.</span></p>}{missingLink && <p><Info size={16}/><span>Sagen i linket kunne ikke findes i kataloget. Du kan vælge en sag herunder.</span></p>}</div>}

        <div className="c-workspace"><div className="c-cases-main"><div className="c-toolbar"><label className="c-search"><Search size={18}/><input aria-label="Søg i sagerne" placeholder="Hvilken sag er du nysgerrig på?" value={query} onChange={event => setQuery(event.target.value)}/>{query && <button aria-label="Ryd søgning" onClick={() => setQuery("")}><X size={15}/></button>}</label><label className="c-topic-filter"><span className="n-sr">Filtrér efter emne</span><select aria-label="Filtrér efter emne" value={topic} onChange={event => setTopic(event.target.value)}><option value="all">Alle emner</option>{TOPICS.map(entry => <option value={entry.id} key={entry.id}>{entry.label}</option>)}</select></label></div><div className="c-filter-row"><div className="c-segmented" aria-label="Geografisk filter">{[["all", "Alle"], ["local", "Tæt på dig"], ["global", "Ude i verden"]].map(([key, label]) => <button key={key} aria-pressed={scope === key} onClick={() => setScope(key)}>{key === "local" ? <MapPin size={13}/> : key === "global" ? <Globe2 size={13}/> : null}{label}</button>)}</div>{view === "mine" && <label className="c-status-filter"><span className="n-sr">Filtrér mine sager</span><select aria-label="Filtrér mine sager" value={status} onChange={event => setStatus(event.target.value)}><option value="all">Alle statusser</option><option value="active">Aktive</option><option value="paused">På pause</option><option value="resolved">Afklarede</option></select></label>}</div>
          <div className="c-results" aria-live="polite"><span>{loading && !data ? "Henter sagerne…" : `${visible.length} ${visible.length === 1 ? "sag" : "sager"}`}{view === "updates" && !loading ? " at følge op på" : ""}</span><span><ShieldCheck size={12}/> Din hukommelse gemmes på denne enhed</span></div>
          {loading && !data ? <div className="c-card-grid c-loading" aria-label="Sagerne indlæses" role="status">{[0, 1, 2, 3].map(value => <div key={value} className="c-skeleton"><i/><span/><span/><span/></div>)}</div> : visible.length ? <div className="c-card-grid">{visible.map(item => <CaseCard key={item.id} item={item} progress={reader.cases[item.id]} beforeRevision={beforeVisit.current[item.id]?.seenRevision || 0} assets={assets} viewBlocked={!!selected || !!modal} onOpen={openCase} onFollow={toggleFollow} onPriority={prioritize} onShown={shown}/>)}</div> : <div className="c-empty">{hasFilters ? <Search size={35}/> : view === "updates" && followed.length ? <CheckCheck size={40}/> : <BookOpen size={38}/>}<h3>{hasFilters ? "Ingen sager med de valg." : view === "updates" && followed.length ? "Du er ajour med dine aktive sager." : error && !data ? "Vi kunne ikke hente overblikket." : "Din sagsoversigt starter her."}</h3><p>{hasFilters ? "Prøv et andet søgeord eller flere emner og steder." : view === "updates" && followed.length ? "Der er ingen nye gennemgange at vise i det senest hentede katalog. Dine sager og deres åbne spørgsmål bliver stående." : error && !data ? "Dit nyhedsfeed er stadig tilgængeligt. Prøv sagsoversigten igen om lidt." : "Find et spørgsmål, du vil have svar på, og vælg Følg sagen. Så husker vi dit udgangspunkt."}</p><button className="n-button" onClick={() => { if (hasFilters) { setQuery(""); setScope("all"); setTopic("all"); setStatus("all"); } else if (error && !data) void refresh(); else navigate(view === "updates" && followed.length ? "mine" : "discover"); }}>{hasFilters ? "Nulstil filtrene" : error && !data ? "Prøv igen" : view === "updates" && followed.length ? "Se mine sager" : "Opdag sager"}<ArrowRight size={16}/></button></div>}
          <div className="c-end-note"><span className="n-brand-mark" aria-hidden="true"><i/><i/><i/><b/></span><p>{view === "discover" ? "Et afgrænset udvalg af sager, vi kan følge ordentligt." : "Du behøver ikke begynde forfra, næste gang du kommer tilbage."}</p></div>
        </div>

        <aside className="c-sidebar"><section className="c-side-monitor"><div className="c-side-icon"><Bell size={20}/></div><span className="c-eyebrow">VI HOLDER ØJE MED FORTSÆTTELSEN</span><h3>{data?.monitoring.state === "scheduled" ? "Sagerne fortsætter, også når du er væk." : "Et spørgsmål kræver opfølgning."}</h3><p>{data?.monitoring.label || "Hver sag har en historik, åbne spørgsmål og et næste skridt."}</p><button className="n-text-button" onClick={() => setModal("method")}>Sådan arbejder vi <ArrowRight size={14}/></button></section>
          {upcoming.length > 0 && <section className="c-side-upcoming"><span className="c-eyebrow">DET NÆSTE, VI VENTER PÅ</span>{upcoming.map(item => { const next = latestCaseUpdate(item).snapshot.nextStep; return <button key={item.id} onClick={() => openCase(item)}><span className="c-upcoming-marker"/><span><strong>{next.expectedAt ? dateLabel(next.expectedAt) : "Tidspunkt ikke offentliggjort"}</strong><span>{next.label}</span><small>{item.question}</small></span><ArrowUpRight size={13}/></button>; })}</section>}
          <section className="c-side-memory"><ShieldCheck size={20}/><h3>Dit overblik. Din hukommelse.</h3><p>Dine sager og læsepositioner gemmes i denne browser. Tag dem med med en eksport.</p><button className="n-text-button" onClick={() => setModal("settings")}>Mine valg og data <ArrowRight size={14}/></button></section><section className="c-side-feedback"><MessageSquare size={20}/><h3>Hvad mangler svar?</h3><p>Fortæl os, hvilke sager og opfølgninger du savner.</p><button className="n-text-button" onClick={() => setModal("feedback")}>Del dit perspektiv <ArrowRight size={14}/></button></section>
        </aside></div>
      </section>

      <section className="c-footer-invite"><div><span className="c-eyebrow">NYSGERRIGHED MED LANG HUKOMMELSE</span><h2>En overskrift er begyndelsen.</h2><p>Fortsættelsen er det, vi er her for.</p></div><button className="n-button n-outline" onClick={() => setModal("signup")}>Følg projektets næste version <ArrowUpRight size={16}/></button></section>
      <footer className="c-footer"><div><Wordmark/><p>Vi husker historien. Du får fortsættelsen.</p></div><nav aria-label="Om Siden sidst"><button onClick={() => setModal("method")}>Kilder & metode</button><button onClick={() => setModal("settings")}>Dine data</button><button onClick={onNewsFeed}>Nyhedsfeed & gemte artikler</button><button onClick={() => setModal("feedback")}>Feedback</button></nav><span>BETA 0.4</span></footer>
    </main>

    <Dialog open={!!detail} title={detail?.question || "Sagens forløb"} close={closeCase} wide>{detail && detailLatest && <div className="c-case-detail"><div className="c-detail-labels"><span>{regionLabel(detail.region)}</span><span>{topicLabel(detail.topics[0])}</span><span className={`c-status-pill status-${detailLatest.snapshot.status}`}>{CASE_STATUS_LABELS[detailLatest.snapshot.status]}</span></div><h2>{detail.question}</h2><p className="c-detail-description">{detail.description}</p><div className="c-detail-actions"><button className={`n-button ${detailProgress ? "n-outline" : ""}`} onClick={() => toggleFollow(detail)}>{detailProgress ? <Check size={16}/> : <Plus size={17}/>} {detailProgress ? "Følger sagen" : "Følg sagen"}</button>{detailProgress && <><button className="c-detail-tool" aria-pressed={detailProgress.priority === "high"} onClick={() => prioritize(detail.id, detailProgress.priority !== "high")}><Star size={16} fill={detailProgress.priority === "high" ? "currentColor" : "none"}/>{detailProgress.priority === "high" ? "Prioriteret" : "Prioritér"}</button><button className="c-detail-tool" onClick={() => pause(detail.id, !detailProgress.paused)}>{detailProgress.paused ? <Play size={16}/> : <Pause size={16}/>} {detailProgress.paused ? "Genoptag" : "Sæt på pause"}</button></>}<button className="c-detail-tool c-copy-link" onClick={() => void copyCase(detail)}><Copy size={15}/> Del sag</button></div>
      {newerDetail && <div className="c-new-edition" role="status"><Sparkles size={18}/><p>Der er kommet en nyere version, mens du havde sagen åben.</p><button onClick={() => openCase(newerDetail)}>Vis den nyeste <ArrowRight size={14}/></button></div>}
      <div className="c-briefing-heading"><span className="c-eyebrow">{detailProgress?.acknowledgedRevision ? "DIN OPFØLGNING" : "DIT UDGANGSPUNKT"}</span><span>Version {detailLatest.revision} · registreret {dateLabel(detailLatest.recordedAt)}</span></div>
      <div className="c-before-now">{detailBefore && detailBefore.revision < detailLatest.revision && <section className="c-before"><span className="c-micro-label">SIDST VIST TIL DIG · VERSION {detailBefore.revision}</span><p>{detailBefore.snapshot.answer}</p></section>}<section className="c-now"><span className="c-micro-label">HVOR STÅR SAGEN NU?</span><h3>{detailLatest.snapshot.answer}</h3><SourceLinks item={detail} ids={detailLatest.sourceIds}/></section></div>
      {detailProgress && detailChanges.length > 0 ? <section className="c-delta-section"><h3>{detailProgress.acknowledgedRevision ? "Det er ændret, siden du var ajour" : "Nyt, siden du begyndte at følge"}<span>{detailChanges.length}</span></h3>{detailChanges.map(update => <div key={update.id} className={`c-delta ${update.kind === "correction" ? "c-delta-correction" : ""}`}><div><span className="c-micro-label">{CASE_KIND_LABELS[update.kind]} · VERSION {update.revision}</span><h4>{update.title}</h4><p>{update.change}</p>{update.kind === "correction" && <p className="c-correction-note">En tidligere oplysning er rettet. Den oprindelige version er bevaret i historikken nedenfor.</p>}<SourceLinks item={detail} ids={update.sourceIds}/></div></div>)}</section> : <section className="c-latest-development"><span className="c-micro-label">SENESTE DOKUMENTEREDE UDVIKLING</span><h3>{detailLatest.title}</h3><p>{detailLatest.change}</p><SourceLinks item={detail} ids={detailLatest.sourceIds}/></section>}
      <section className="c-meaning"><div className="c-note-icon"><Info size={19}/></div><div><h3>Hvad betyder det?</h3><p>{detailLatest.whyItMatters}</p></div></section>
      <div className="c-detail-grid"><section className="c-open-questions"><span className="c-eyebrow">DET MANGLER SVAR</span><h3>{detailLatest.snapshot.openQuestions.length ? "Vi holder spørgsmålene åbne." : "Det afgrænsede spørgsmål er besvaret."}</h3>{detailLatest.snapshot.openQuestions.length ? <ul>{detailLatest.snapshot.openQuestions.map(question => <li key={question}>{question}</li>)}</ul> : <p>Ny dokumentation kan give anledning til at genåbne sagen.</p>}</section><section className="c-next-step"><Clock3 size={22}/><span className="c-eyebrow">DET FØLGER VI OP PÅ</span><h3>{detailLatest.snapshot.nextStep.label}</h3><p>{detailLatest.snapshot.nextStep.expectedAt ? <><time dateTime={detailLatest.snapshot.nextStep.expectedAt}>{dateLabel(detailLatest.snapshot.nextStep.expectedAt)}</time><span> · Annonceret tidspunkt. En dato er ikke i sig selv dokumentation for, at noget er sket.</span></> : "Tidspunkt ikke offentliggjort."}</p><SourceLinks item={detail} ids={detailLatest.snapshot.nextStep.sourceIds}/></section></div>
      <section className="c-detail-check"><CheckStatus item={detail}/><p>{detail.lastCheck?.note || "Der er endnu ikke registreret en særskilt kildekontrol."}</p>{detail.lastCheck?.status !== "checked" && <span>En manglende kontrol betyder ikke, at sagen står stille.</span>}</section>
      <section className="c-timeline-section"><div className="c-detail-section-heading"><History size={21}/><h3>Sådan kom vi hertil</h3><span>{detail.updates.length} dokumenterede trin</span></div><p className="c-section-explainer">Forløbet er ordnet efter vores versioner. En ældre begivenhed kan blive dokumenteret senere; den får derfor en ny version.</p><ol className="c-timeline">{[...detail.updates].reverse().map(update => <li key={update.id} className={update.kind === "correction" ? "correction" : ""}><div className="c-timeline-dot"/><div className="c-timeline-entry"><div className="c-timeline-meta"><span>{CASE_KIND_LABELS[update.kind]}</span><time dateTime={update.occurredAt || undefined}>{update.occurredAt ? dateLabel(update.occurredAt) : "Begivenhedsdato ikke oplyst"}</time></div><h4>{update.title}</h4><p>{update.change}</p>{update.correctsUpdateId && <span className="c-correction-note">Retter version {detail.updates.find(previous => previous.id === update.correctsUpdateId)?.revision || "tidligere"}.</span>}<SourceLinks item={detail} ids={update.sourceIds}/><details><summary>Se status i denne version <ChevronDown size={13}/></summary><p>{update.snapshot.answer}</p><span>Version {update.revision} · registreret {dateLabel(update.recordedAt, true)}</span></details></div></li>)}</ol></section>
      <section className="c-detail-sources"><div className="c-detail-section-heading"><FileText size={20}/><h3>Se dokumentationen</h3><span>{detail.sources.length} kilder</span></div><p className="c-section-explainer">Kilderne dokumenterer forskellige dele af forløbet. Afsender, dato og hvad kilden understøtter, følger med.</p>{detail.sources.map(source => <article key={source.id}><div><span>{source.publisher}</span><h4><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}<ArrowUpRight size={15}/></a></h4><p>{source.evidence}</p><small>{source.publishedAt ? `Udgivet ${dateLabel(source.publishedAt)}` : "Publiceringsdato ikke oplyst"} · gennemgået {dateLabel(source.checkedAt)}</small></div></article>)}</section>
      <div className="c-acknowledge"><div><CheckCheck size={21}/><p><strong>{detailProgress?.acknowledgedRevision === detailLatest.revision ? "Du er ajour med denne version." : "Er du med på, hvor sagen står?"}</strong><span>{detailProgress ? `Din læseposition gemmes ved version ${detailLatest.revision} på denne enhed.` : "Følg sagen for at gemme dit udgangspunkt."}</span></p></div>{detailProgress ? <button className="n-button" disabled={detailProgress.acknowledgedRevision >= detailLatest.revision} onClick={() => acknowledge(detail)}><Check size={16}/>{detailProgress.acknowledgedRevision >= detailLatest.revision ? "Ajour" : "Jeg er ajour"}</button> : <button className="n-button" onClick={() => toggleFollow(detail)}><Plus size={16}/>Følg sagen</button>}</div>
    </div>}</Dialog>

    <Dialog open={modal === "settings"} title="Mine sager og data" close={() => { setModal(null); setConfirmReset(false); }}><span className="c-eyebrow">DU BESTEMMER</span><h2>Mine sager og data.</h2><p className="c-modal-intro">Din sagsoversigt er privat og gemmes i denne browser. Emailtilmelding er en separat venteliste og synkroniserer ikke dine sager.</p><div className="c-data-summary"><div><strong>{Object.keys(reader.cases).length}</strong><span>fulgte sager</span></div><div><strong>{paused.length}</strong><span>på pause</span></div><div><strong>{followed.filter(item => reader.cases[item.id].priority === "high").length}</strong><span>prioriterede</span></div></div><section className="c-settings-section"><h3>Tag hukommelsen med.</h3><p>Eksportér dine valg og læsepositioner. En import erstatter dine sagsvalg her. Dine gemte artikler i nyhedsfeedet bevares.</p><div className="c-settings-buttons"><button className="n-button n-outline" onClick={exportProfile}><ArrowDownToLine size={16}/> Eksportér mine sager</button><button className="n-button n-outline" disabled={!cases.length} onClick={() => fileInput.current?.click()}><Upload size={16}/> Importér sager</button><input ref={fileInput} type="file" accept="application/json,.json" className="n-sr" aria-label="Importér en sagseksport" onChange={event => { const file = event.target.files?.[0]; if (file) void importProfile(file); }}/></div>{importError && <p role="alert" className="n-form-error">{importError}</p>}</section><section className="c-settings-section"><h3>Hvad husker vi?</h3><p>Hvilke sager du følger, prioriterer og pauser. Hvilke versioner du har fået vist og åbnet. Og hvor du selv har valgt “Jeg er ajour”. Et besøg på forsiden flytter ikke din læseposition.</p><p>Der gemmes ingen email eller tilmeldingskode i sagseksporten.</p></section><section className="c-settings-section"><h3>Start din sagsoversigt forfra.</h3><p>Fjerner dine fulgte sager og personlige læsepositioner fra denne browser. Eksportér dem først, hvis du vil beholde en kopi.</p>{confirmReset ? <div className="c-reset-confirm"><p>Vil du fjerne dine sagsvalg på denne enhed?</p><button className="n-button n-danger" onClick={() => { setReader({ version: 1, cases: {} }); beforeVisit.current = {}; setConfirmReset(false); setView("discover"); setToast("Dine lokale sagsvalg er nulstillet."); }}>Ja, nulstil mine sager</button><button className="n-text-button" onClick={() => setConfirmReset(false)}>Fortryd</button></div> : <button className="n-text-button" onClick={() => setConfirmReset(true)}>Nulstil mine sagsvalg <ArrowRight size={14}/></button>}</section><button className="n-text-button" onClick={() => setModal("signup")}>Administrér min emailtilmelding <ArrowUpRight size={14}/></button></Dialog>

    <Dialog open={modal === "method"} title="Sådan husker vi og følger op" close={() => setModal(null)}><span className="c-eyebrow">KILDER, HUKOMMELSE OG OPFØLGNING</span><h2>Et spørgsmål fortjener en fortsættelse.</h2><div className="c-method"><p className="c-modal-intro">Siden sidst samler et afgrænset udvalg af virkelige sager. Hver sag har et konkret spørgsmål, kildebelagte versioner og et næste skridt.</p><h3>Vi bevarer historien.</h3><p>Tidligere versioner bliver stående. En ny artikel er ikke automatisk en ny udvikling; gentagelser samles, og en rettelse bliver synlig som en rettelse.</p><h3>Vi husker dit udgangspunkt.</h3><p>Vi skelner mellem det, der har været synligt, det du har åbnet, og det du selv har markeret som ajour. “Siden sidst” sammenligner med dit personlige ajourføringspunkt. Første gang du følger en sag, får du dens aktuelle udgangspunkt.</p><h3>Opfølgning kræver dokumentation.</h3><p>{data?.monitoring.label || "Den enkelte sags seneste kildekontrol og næste kendte skridt fremgår af sagssiden."}</p><p>En annonceret dato er et tidspunkt at holde øje med. Vi registrerer ikke en begivenhed som gennemført alene, fordi datoen er passeret. Når en kilde ikke kan kontrolleres, viser vi det særskilt.</p><h3>Du kan se os efter.</h3><p>Kilderne linker til de originale dokumenter og meddelelser. Publiceringstid, gennemgangstid og begivenhedstid kan være forskellige. Opsummeringerne er på dansk; originalkilderne kan være på andre sprog.</p><h3>Billederne illustrerer emner.</h3><p>Billederne er genererede emneillustrationer. De viser ikke nødvendigvis det sted eller den begivenhed, sagen handler om.</p><h3>En beta, du kan prøve frit.</h3><p>Personlige valg gemmes på denne enhed og kan eksporteres. Der er endnu ikke kontosynkronisering eller automatiske emailopdateringer. Projektets emailventeliste administreres separat.</p><button className="n-button" onClick={() => { setModal(null); navigate("discover"); }}>Find en sag at følge <ArrowRight size={16}/></button></div></Dialog>
    <Dialog open={modal === "signup"} title="Følg projektets udvikling" close={() => setModal(null)}><span className="c-eyebrow">PROJEKTETS VENTELISTE</span><h2>Vær med i næste kapitel.</h2><Membership apiOrigin={api} notify={setToast}/></Dialog>
    <Dialog open={modal === "feedback"} title="Hjælp os med opfølgningen" close={() => setModal(null)}><span className="c-eyebrow">DIT PERSPEKTIV</span><h2>Hvad mangler svar?</h2><Feedback apiOrigin={api} notify={setToast}/></Dialog>
    {toast && <div className="c-toast" role="status"><Check size={16}/><span>{toast}</span><button aria-label="Luk besked" onClick={() => setToast("")}><X size={16}/></button></div>}
  </div>;
}
