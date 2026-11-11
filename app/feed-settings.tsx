"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { ArrowDown, ArrowUp, Check, Download, Globe2, MapPin, RotateCcw, Upload } from "lucide-react";
import { REGIONS, TOPICS, type FeedPreferences, type NewsSource, type RegionId, type TopicId } from "./lib/news-types";
import "./feed-settings.css";

export interface FeedSettingsProps {
  preferences: FeedPreferences;
  sources: NewsSource[];
  onChange: (next: FeedPreferences) => void;
  onExport: () => void;
  onImport: (file: File) => Promise<void>;
  onReset: () => void;
}

const INITIAL_REGIONS = new Set<RegionId>(["koebenhavn", "odense", "danmark", "europa", "verden"]);
const SOURCE_STATUS = {
  ok: { label: "Opdateret", className: "fs-health-ok" },
  cached: { label: "Gemt version", className: "fs-health-cached" },
  curated: { label: "Udvalgte historier", className: "fs-health-curated" },
  unavailable: { label: "Utilgængelig lige nu", className: "fs-health-unavailable" },
} as const;

export default function FeedSettings({ preferences, sources, onChange, onExport, onImport, onReset }: FeedSettingsProps) {
  const savedWords = preferences.mutedWords.join(", ");
  const [wordDraft, setWordDraft] = useState(savedWords);
  const [wordError, setWordError] = useState("");
  const [wordMessage, setWordMessage] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const [importError, setImportError] = useState("");
  const [importMessage, setImportMessage] = useState("");

  useEffect(() => { setWordDraft(savedWords); setWordError(""); }, [savedWords]);

  const selectedTopics = preferences.topics.map((id) => TOPICS.find((topic) => topic.id === id)).filter((topic): topic is typeof TOPICS[number] => !!topic);
  const orderedTopics = [...selectedTopics, ...TOPICS.filter((topic) => !preferences.topics.includes(topic.id))];
  const activeRegions = new Set(sources.filter((source) => source.status !== "unavailable").map((source) => source.region));
  const availableRegions = REGIONS.filter((region) => INITIAL_REGIONS.has(region.id) || activeRegions.has(region.id));
  const previousRegions = REGIONS.filter((region) => preferences.regions.includes(region.id) && !availableRegions.some((available) => available.id === region.id));
  const uniqueSources = sources.filter((source, index) => sources.findIndex((item) => item.id === source.id) === index);
  const visibleSourceCount = uniqueSources.filter((source) => !preferences.hiddenSources.includes(source.id)).length;

  function toggleTopic(id: TopicId, checked: boolean) {
    onChange({ ...preferences, topics: checked ? [...preferences.topics, id] : preferences.topics.filter((topic) => topic !== id) });
  }

  function moveTopic(id: TopicId, direction: -1 | 1) {
    const index = preferences.topics.indexOf(id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= preferences.topics.length) return;
    const next = [...preferences.topics];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    onChange({ ...preferences, topics: next });
  }

  function toggleRegion(id: RegionId, checked: boolean) {
    onChange({ ...preferences, regions: checked ? [...preferences.regions, id] : preferences.regions.filter((region) => region !== id) });
  }

  function toggleSource(id: string, checked: boolean) {
    onChange({ ...preferences, hiddenSources: checked ? preferences.hiddenSources.filter((source) => source !== id) : [...new Set([...preferences.hiddenSources, id])] });
  }

  function applyWords(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = [...new Set(wordDraft.split(/[,\n]+/).map((word) => word.trim().toLocaleLowerCase("da-DK")).filter(Boolean))];
    setWordMessage("");
    if (next.length > 20) { setWordError("Du kan skjule højst 20 ord eller fraser. Fjern nogle, og prøv igen."); return; }
    if (next.some((word) => word.length > 80)) { setWordError("Et ord eller en frase må højst være 80 tegn."); return; }
    setWordError("");
    onChange({ ...preferences, mutedWords: next });
    setWordDraft(next.join(", "));
    setWordMessage(next.length ? `${next.length} ${next.length === 1 ? "ord eller frase er" : "ord og fraser er"} skjult i dit feed.` : "Ingen ord er skjult i dit feed.");
  }

  async function importPreferences(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setImportBusy(true); setImportError(""); setImportMessage("");
    try {
      await onImport(file);
      setImportMessage("Dine feedvalg er importeret.");
      setWordMessage("");
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Filen kunne ikke importeres. Vælg en eksporteret JSON-fil fra Siden sidst.");
    } finally {
      setImportBusy(false); input.value = "";
    }
  }

  return <div className="feed-settings">
    <p className="fs-intro"><Check size={16} aria-hidden="true" /> Dine valg gemmes løbende på denne enhed.</p>

    <section className="fs-section" aria-labelledby="fs-topics-title">
      <div className="fs-section-heading"><span className="fs-step" aria-hidden="true">01</span><div><h3 id="fs-topics-title">Emner og prioritet</h3><p>Vælg dine interesser. Emner øverst får størst vægt ved personlig sortering.</p></div><span className="fs-section-count">{preferences.topics.length} / {TOPICS.length}</span></div>
      <div className="fs-topic-list">
        {orderedTopics.map((topic) => {
          const index = preferences.topics.indexOf(topic.id);
          const selected = index >= 0;
          return <div className={`fs-topic-row ${selected ? "fs-selected" : ""}`} key={topic.id}>
            <label className="fs-topic-label"><input type="checkbox" checked={selected} onChange={(event) => toggleTopic(topic.id, event.target.checked)} /><span className="fs-topic-copy"><strong>{topic.label}</strong><span>{topic.description}</span></span></label>
            {selected && <div className="fs-priority"><span className="fs-rank" aria-label={`Prioritet ${index + 1}`}>{index + 1}</span><button type="button" disabled={index === 0} aria-label={`Flyt ${topic.label} op i prioritet`} onClick={() => moveTopic(topic.id, -1)}><ArrowUp size={16} aria-hidden="true" /></button><button type="button" disabled={index === preferences.topics.length - 1} aria-label={`Flyt ${topic.label} ned i prioritet`} onClick={() => moveTopic(topic.id, 1)}><ArrowDown size={16} aria-hidden="true" /></button></div>}
          </div>;
        })}
      </div>
      {!preferences.topics.length && <p className="fs-empty-note" role="status">Vælg mindst ét emne for at få historier i dit personlige feed.</p>}
    </section>

    <section className="fs-section" aria-labelledby="fs-regions-title">
      <div className="fs-section-heading"><span className="fs-step" aria-hidden="true">02</span><div><h3 id="fs-regions-title">Fra din by til verden</h3><p>Du kan følge flere områder på én gang.</p></div></div>
      <div className="fs-region-grid" role="group" aria-labelledby="fs-regions-title">{availableRegions.map((region) => <label className={`fs-region ${preferences.regions.includes(region.id) ? "fs-selected" : ""}`} key={region.id}><input type="checkbox" checked={preferences.regions.includes(region.id)} onChange={(event) => toggleRegion(region.id, event.target.checked)} />{region.scope === "local" ? <MapPin size={17} aria-hidden="true" /> : <Globe2 size={17} aria-hidden="true" />}<span>{region.label}</span></label>)}</div>
      {previousRegions.length > 0 && <div className="fs-previous-regions"><p>Tidligere valgte områder uden en aktiv kilde:</p>{previousRegions.map((region) => <label key={region.id}><input type="checkbox" checked onChange={() => toggleRegion(region.id, false)} />{region.label}</label>)}</div>}
      {!preferences.regions.length && <p className="fs-empty-note" role="status">Vælg mindst ét område for at få historier i dit feed.</p>}
    </section>

    <section className="fs-section" aria-labelledby="fs-balance-title">
      <div className="fs-section-heading"><span className="fs-step" aria-hidden="true">03</span><div><h3 id="fs-balance-title">Dit perspektiv</h3><p>Vægt lokale eller globale historier højere i den personlige sortering.</p></div></div>
      <div className="fs-balance-grid" role="radiogroup" aria-labelledby="fs-balance-title">{([
        ["balanced", "Ligevægt", "Plads til både nært og fjernt"],
        ["local", "Mere lokalt", "Din by og Danmark først"],
        ["global", "Mere globalt", "Europa og verden først"],
      ] as const).map(([value, label, description]) => <label className={`fs-balance ${preferences.balance === value ? "fs-selected" : ""}`} key={value}><input type="radio" name="fs-balance" value={value} checked={preferences.balance === value} onChange={() => onChange({ ...preferences, balance: value })} /><span><strong>{label}</strong><small>{description}</small></span></label>)}</div>
    </section>

    <section className="fs-section" aria-labelledby="fs-sources-title">
      <div className="fs-section-heading"><span className="fs-step" aria-hidden="true">04</span><div><h3 id="fs-sources-title">Kilder, du vil se</h3><p>Fravælg kilder, du ikke ønsker i dit feed.</p></div>{uniqueSources.length > 0 && <span className="fs-section-count">{visibleSourceCount} / {uniqueSources.length}</span>}</div>
      {uniqueSources.length ? <div className="fs-source-list">{uniqueSources.map((source) => {
        const status = SOURCE_STATUS[source.status];
        return <label className="fs-source" key={source.id}><input type="checkbox" checked={!preferences.hiddenSources.includes(source.id)} onChange={(event) => toggleSource(source.id, event.target.checked)} /><span className="fs-source-copy"><strong>{source.name}</strong><span className="fs-source-meta"><span>{source.articleCount} {source.articleCount === 1 ? "historie" : "historier"}</span><span className={`fs-health ${status.className}`}>{status.label}</span></span>{source.status === "unavailable" && <small>Vi kunne ikke hente denne kilde. Du kan beholde den valgt.</small>}</span></label>;
      })}</div> : <p className="fs-empty-note">Der er ingen kilder at vise endnu. Dine eksisterende kildevalg bevares.</p>}
      {uniqueSources.length > 0 && visibleSourceCount === 0 && <p className="fs-empty-note" role="status">Alle kilder er fravalgt. Vælg mindst én for at se historier.</p>}
    </section>

    <section className="fs-section" aria-labelledby="fs-words-title">
      <div className="fs-section-heading"><span className="fs-step" aria-hidden="true">05</span><div><h3 id="fs-words-title">Ord, du vil springe over</h3><p>Skjul historier med bestemte ord eller fraser. Adskil dem med komma.</p></div></div>
      <form className="fs-word-form" onSubmit={applyWords}><label className="fs-input-label" htmlFor="fs-muted-words">Skjulte ord og fraser <span>Højst 20</span></label><textarea id="fs-muted-words" rows={2} maxLength={1700} value={wordDraft} placeholder="Fx fodbold, kendisser, aktiekurser" aria-invalid={!!wordError} aria-describedby={wordError ? "fs-word-error" : "fs-word-hint"} onChange={(event) => { setWordDraft(event.target.value); setWordError(""); setWordMessage(""); }} /><div className="fs-word-actions"><p id="fs-word-hint">Ændringen gælder, når du vælger Anvend.</p><button type="submit" className="fs-action-button fs-action-primary">Anvend</button></div>{wordError && <p className="fs-error" role="alert" id="fs-word-error">{wordError}</p>}{wordMessage && <p className="fs-success" role="status">{wordMessage}</p>}</form>
    </section>

    <section className="fs-section" aria-labelledby="fs-display-title">
      <div className="fs-section-heading"><span className="fs-step" aria-hidden="true">06</span><div><h3 id="fs-display-title">Tid og visning</h3><p>Vælg, hvor langt tilbage du vil læse, og hvordan feedet vises.</p></div></div>
      <fieldset className="fs-control-group"><legend>Periode</legend><div className="fs-segmented">{([["all", "Alle datoer"], ["day", "24 timer"], ["week", "7 dage"]] as const).map(([value, label]) => <label className={preferences.period === value ? "fs-selected" : ""} key={value}><input type="radio" name="fs-period" checked={preferences.period === value} onChange={() => onChange({ ...preferences, period: value })} /><span>{label}</span></label>)}</div></fieldset>
      <fieldset className="fs-control-group"><legend>Sortering</legend><div className="fs-segmented">{([["personal", "Mine prioriteter"], ["recent", "Nyeste først"]] as const).map(([value, label]) => <label className={preferences.sort === value ? "fs-selected" : ""} key={value}><input type="radio" name="fs-sort" checked={preferences.sort === value} onChange={() => onChange({ ...preferences, sort: value })} /><span>{label}</span></label>)}</div></fieldset>
      <label className="fs-compact-control"><input type="checkbox" checked={preferences.compact} onChange={(event) => onChange({ ...preferences, compact: event.target.checked })} /><span><strong>Kompakt visning</strong><small>Flere overskrifter på mindre plads.</small></span></label>
    </section>

    <section className="fs-section fs-portable" aria-labelledby="fs-portable-title">
      <div className="fs-section-heading"><span className="fs-step" aria-hidden="true">07</span><div><h3 id="fs-portable-title">Tag dine valg med</h3><p>Eksportér en JSON-fil, og importér den i en anden browser.</p></div></div>
      <div className="fs-portable-actions"><button type="button" className="fs-action-button" onClick={onExport}><Download size={17} aria-hidden="true" /> Eksportér valg</button><label className={`fs-action-button fs-upload ${importBusy ? "fs-disabled" : ""}`}><Upload size={17} aria-hidden="true" />{importBusy ? "Importerer…" : "Importér valg"}<input type="file" accept="application/json,.json" aria-label="Importér feedvalg fra en JSON-fil" disabled={importBusy} onChange={importPreferences} /></label></div>
      {importError && <p className="fs-error" role="alert">{importError}</p>}{importMessage && <p className="fs-success" role="status">{importMessage}</p>}
      <button type="button" className="fs-reset" onClick={() => { onReset(); setWordDraft(""); setWordError(""); setWordMessage(""); setImportError(""); setImportMessage(""); }}><RotateCcw size={15} aria-hidden="true" /> Gendan standardvalg for feedet</button>
    </section>
  </div>;
}
