"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Check, Copy, Mail, Trash2 } from "lucide-react";
const TOKEN_KEY = "siden-sidst-registration-v1";
const ATTEMPT_KEY = "siden-sidst-registration-attempt-v1";

async function send(apiOrigin: string, path: string, payload: unknown, method = "POST") {
  const response = await fetch(`${apiOrigin}${path}`, { method, credentials: "omit", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const decoded: unknown = await response.json().catch(() => ({ error: "Der kom ikke et gyldigt svar. Prøv igen." }));
  const data = decoded && typeof decoded === "object" ? decoded as { ok?: boolean; error?: string; token?: string } : {};
  if (!response.ok || data?.ok !== true) throw new Error(data?.error || "Det lykkedes ikke. Prøv igen om lidt.");
  return data;
}
export function Membership({ apiOrigin, notify }: { apiOrigin: string; notify: (message: string) => void }) {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [code, setCode] = useState("");
  const [manage, setManage] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const pending = useRef<{ email: string; token: string } | null>(null);
  useEffect(() => { try { const value = localStorage.getItem(TOKEN_KEY) || ""; if (/^[a-f0-9]{64}$/.test(value)) { setToken(value); setCode(value); } } catch {} }, []);
  async function subscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const normalized = email.trim().toLowerCase();
      if (!pending.current) try { const value = JSON.parse(localStorage.getItem(ATTEMPT_KEY) || "null"); if (value?.email === normalized && /^[a-f0-9]{64}$/.test(value.token)) pending.current = value; } catch {}
      if (!pending.current || pending.current.email !== normalized) pending.current = { email: normalized, token: Array.from(crypto.getRandomValues(new Uint8Array(32)), value => value.toString(16).padStart(2, "0")).join("") };
      try { localStorage.setItem(ATTEMPT_KEY, JSON.stringify(pending.current)); } catch {}
      const result = await send(apiOrigin, "/api/subscriptions", { email: normalized, consent: form.get("consent") === "on", interests: [], website: form.get("website") || "", receiptToken: pending.current.token });
      if (typeof result.token !== "string" || !/^[a-f0-9]{64}$/.test(result.token)) throw new Error("Tilmeldingen kunne ikke bekræftes. Prøv igen.");
      setToken(result.token); setCode(result.token); setDone(true);
      try { localStorage.setItem(TOKEN_KEY, result.token); localStorage.removeItem(ATTEMPT_KEY); } catch { notify("Tilmeldingen er gemt. Gem selv slettekoden, da browseren ikke tillader lokal lagring."); }
    } catch (e) { setError(e instanceof Error ? e.message : "Der er ikke forbindelse lige nu. Prøv igen."); } finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true); setError("");
    try { await send(apiOrigin, "/api/subscriptions", { token: code }, "DELETE"); if (code.trim() === token) { setToken(""); try { localStorage.removeItem(TOKEN_KEY); } catch {} } setCode(""); setConfirm(false); setDone(false); notify("Emailtilmeldingen er slettet."); }
    catch (e) { setError(e instanceof Error ? e.message : "Sletningen lykkedes ikke."); } finally { setBusy(false); }
  }
  async function copyCode() { try { await navigator.clipboard.writeText(token); notify("Slettekoden er kopieret."); } catch { notify("Markér og kopiér koden i feltet."); } }
  return <div className="n-membership">
    <div className="n-modal-symbol"><Mail size={24} /></div>
    {manage ? <><h3>Administrér din tilmelding</h3><p>Indsæt koden fra den oprindelige tilmelding. Den kan bruges på tværs af browsere.</p><label htmlFor="n-delete-code">Slettekode</label><input className="n-input n-code" id="n-delete-code" value={code} onChange={e => { setCode(e.target.value); setConfirm(false); }} maxLength={64} autoComplete="off" placeholder="Din kode på 64 tegn" />{confirm ? <div className="n-confirm"><p>Vil du slette din email fra ventelisten?</p><button className="n-button n-danger" disabled={busy} onClick={remove}>{busy ? "Sletter…" : "Ja, slet tilmeldingen"}</button><button className="n-text-button" onClick={() => setConfirm(false)}>Fortryd</button></div> : <button className="n-button n-outline n-full" disabled={code.trim().length !== 64} onClick={() => setConfirm(true)}><Trash2 size={16} /> Slet min tilmelding</button>}<button className="n-text-button" onClick={() => { setManage(false); setError(""); }}>Tilbage</button></> : done || token ? <><h3>{done ? "Din tilmelding er modtaget." : "Du har en gemt tilmeldingskode."}</h3><p>Du kan fortsætte med at bruge nyhedsfeedet. En tidligere tilmelding til samme email ændres ikke.</p><div className="n-success"><Check size={18} /> Der udsendes endnu ingen automatiske emails.</div><details className="n-receipt"><summary>Vis din slettekode</summary><code>{token}</code><button className="n-text-button" onClick={copyCode}><Copy size={15} /> Kopiér kode</button></details><p className="n-fine">Koden gælder en ny tilmelding oprettet her. Havde du allerede tilmeldt denne email, skal du bruge din oprindelige kode.</p><button className="n-button n-full" onClick={() => setManage(true)}>Administrér tilmelding <ArrowRight size={16} /></button><details className="n-alt-email"><summary>Tilmeld en anden email</summary><p>Gem koden ovenfor først. Den oprindelige tilmelding bliver stående.</p><button className="n-text-button" onClick={() => { setToken(""); setDone(false); setEmail(""); pending.current = null; try { localStorage.removeItem(TOKEN_KEY); } catch {} }}>Åbn formularen igen</button></details></> : <><h3>Få næste kapitel med.</h3><p>Skriv dig op til kommende versioner af Siden sidst. Feedet kan bruges frit uden tilmelding.</p><form onSubmit={subscribe}><label htmlFor="n-signup-email">Din email</label><input id="n-signup-email" className="n-input" type="email" required maxLength={254} autoComplete="email" placeholder="dig@eksempel.dk" value={email} onChange={e => setEmail(e.target.value)} /><div className="n-honeypot" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div><label className="n-checkbox"><input type="checkbox" name="consent" required /><span>Ja, Siden sidst må gemme min email og kontakte mig om projektet.</span></label><button className="n-button n-full" type="submit" disabled={busy}>{busy ? "Gemmer…" : "Skriv mig op"}<ArrowRight size={17} /></button><p className="n-fine">En venteliste til projektet. Der udsendes endnu ikke automatiske nyhedsbreve.</p></form><button className="n-text-button" onClick={() => setManage(true)}>Har du allerede en tilmelding?</button></>}
    {error && <p className="n-form-error" role="alert">{error}</p>}
  </div>;
}
export function Feedback({ apiOrigin, notify }: { apiOrigin: string; notify: (message: string) => void }) {
  const [rating, setRating] = useState<number | null>(null), [wouldReturn, setWouldReturn] = useState(""), [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false), [done, setDone] = useState(false), [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); const form = new FormData(event.currentTarget);
    try { await send(apiOrigin, "/api/feedback", { clarity: rating, wouldReturn, comment, storyId: null, website: form.get("website") || "" }); setDone(true); notify("Tak. Din feedback er gemt."); }
    catch (e) { setError(e instanceof Error ? e.message : "Prøv igen om lidt."); } finally { setBusy(false); }
  }
  return done ? <div className="n-empty n-feedback-success"><Check size={36} /><h3>Tak for dit perspektiv.</h3><p>Din feedback hjælper os med at vælge, hvad der skal blive bedre.</p></div> : <form className="n-feedback" onSubmit={submit}><p>Tre korte spørgsmål. Svarene gemmes uden din email.</p><fieldset><legend>Hvor overskueligt er dit nyhedsfeed?</legend><div className="n-rating">{[1,2,3,4,5].map(n=><label key={n} className={rating === n ? "selected" : ""}><input type="radio" name="clarity" value={n} required checked={rating===n} onChange={()=>setRating(n)} /><span>{n}</span></label>)}</div><div className="n-scale"><span>Uoverskueligt</span><span>Meget overskueligt</span></div></fieldset><fieldset><legend>Ville du bruge Siden sidst igen?</legend><div className="n-rating">{[["yes","Ja"],["maybe","Måske"],["no","Nej"]].map(([value,label])=><label key={value} className={wouldReturn===value?"selected":""}><input type="radio" name="return" required checked={wouldReturn===value} onChange={()=>setWouldReturn(value)}/><span>{label}</span></label>)}</div></fieldset><label htmlFor="n-feedback-comment">Hvad skal blive bedre? <span>(valgfrit)</span></label><textarea className="n-input" id="n-feedback-comment" maxLength={1500} rows={4} value={comment} onChange={e=>setComment(e.target.value)} placeholder="En kilde, et lokalområde eller noget i oplevelsen…" /><div className="n-honeypot" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off"/></label></div>{error&&<p className="n-form-error" role="alert">{error}</p>}<button type="submit" className="n-button n-full" disabled={busy}>{busy?"Gemmer…":"Send feedback"}<ArrowRight size={17}/></button></form>;
}
