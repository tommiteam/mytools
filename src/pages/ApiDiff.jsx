// ApiDiff.jsx
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import "../ApiDiff.css";
import { API_DIF_URL } from "../utils/config";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const API_BASE = API_DIF_URL;

// user presets storage
const LS_KEY = "apidiff.presets.v1";

// ✅ NEW: base URL storage (primary/other)
const LS_PRIMARY_BASE = "apidiff.base.primary.v1";
const LS_OTHER_BASE = "apidiff.base.other.v1";

/** ---------------------------
 * Helpers
 * --------------------------*/
function kvToObj(kvs) {
    const out = {};
    for (const { k, v } of kvs) {
        if (k?.trim()) out[k.trim()] = v ?? "";
    }
    return out;
}

function objToKv(obj) {
    if (!obj) return [{ k: "", v: "" }];
    const entries = Object.entries(obj);
    return entries.length ? entries.map(([k, v]) => ({ k, v: String(v) })) : [{ k: "", v: "" }];
}

function safeParseJSON(str) {
    try {
        return JSON.parse(str);
    } catch {
        return null;
    }
}

function loadUserPresets() {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = safeParseJSON(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p) => p && typeof p.id === "string" && typeof p.name === "string" && p.data);
}

function saveUserPresets(presets) {
    localStorage.setItem(LS_KEY, JSON.stringify(presets));
}

function shallowEqualObj(a, b) {
    if (a === b) return true;
    if (!a || !b) return false;
    const ak = Object.keys(a);
    const bk = Object.keys(b);
    if (ak.length !== bk.length) return false;
    for (const k of ak) {
        if (a[k] !== b[k]) return false;
    }
    return true;
}

function safeStringify(value, space = 2) {
    try {
        return JSON.stringify(value, null, space);
    } catch {
        try {
            return String(value);
        } catch {
            return "[unserializable]";
        }
    }
}

function valuePreview(value) {
    if (value == null) return String(value);
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (Array.isArray(value)) return `Array(${value.length})`;
    if (typeof value === "object") return `Object(${Object.keys(value).length} keys)`;
    return String(value);
}

function toCsvString(v) {
    if (Array.isArray(v)) return v.join(", ");
    if (typeof v === "string") return v;
    return "";
}

function csvToArray(csv) {
    return String(csv || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
}

// ✅ NEW: resolve relative preset URLs against a runtime base URL
function isAbsoluteUrl(u) {
    return /^https?:\/\//i.test(String(u || ""));
}

function joinUrl(base, path) {
    const b = String(base || "").trim().replace(/\/+$/, "");
    const p = String(path || "").trim();
    if (!b) return p;
    if (!p) return b;
    const p2 = p.startsWith("/") ? p : `/${p}`;
    return `${b}${p2}`;
}

function resolveUrl(inputUrl, baseUrl) {
    if (!inputUrl) return "";
    return isAbsoluteUrl(inputUrl) ? inputUrl : joinUrl(baseUrl, inputUrl);
}

/** ---------------------------
 * UI components
 * --------------------------*/
function SectionHeader({ title, right }) {
    return (
        <div className="secHead">
            <div className="secHead__title">{title}</div>
            <div className="secHead__right">{right}</div>
        </div>
    );
}

function KvEditor({ label, kvs, setKvs, hint }) {
    return (
        <div className="kv">
            <div className="kv__head">
                <div>
                    <div className="kv__title">{label}</div>
                    {hint ? <div className="kv__hint">{hint}</div> : null}
                </div>
                <button className="btn btn--sm" onClick={() => setKvs((prev) => [...prev, { k: "", v: "" }])}>
                    + Add
                </button>
            </div>

            <div className="kv__rows">
                {kvs.map((row, idx) => (
                    <div key={idx} className="kv__row">
                        <input
                            className="input kv__key"
                            placeholder="key"
                            value={row.k}
                            onChange={(e) => {
                                const val = e.target.value;
                                setKvs((prev) => {
                                    const next = [...prev];
                                    next[idx] = { ...next[idx], k: val };
                                    return next;
                                });
                            }}
                        />
                        <input
                            className="input"
                            placeholder="value"
                            value={row.v}
                            onChange={(e) => {
                                const val = e.target.value;
                                setKvs((prev) => {
                                    const next = [...prev];
                                    next[idx] = { ...next[idx], v: val };
                                    return next;
                                });
                            }}
                        />
                        <button
                            className="btn btn--sm btn--ghost"
                            onClick={() => setKvs((prev) => prev.filter((_, i) => i !== idx))}
                            disabled={kvs.length === 1}
                            title="Remove row"
                        >
                            −
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

/** Pretty JSON cell (preview + expandable pretty view) */
function JsonCell({ value }) {
    const pretty = useMemo(() => safeStringify(value, 2), [value]);
    const compact = useMemo(() => safeStringify(value, 0), [value]);

    const isTiny =
        value == null ||
        (typeof value === "string" && value.length <= 80) ||
        (typeof value !== "object" && String(value).length <= 80) ||
        compact.length <= 120;

    if (isTiny) {
        return <span className="code code--wrap">{compact}</span>;
    }

    const label = valuePreview(value);

    return (
        <details className="jsonDetails">
            <summary className="jsonDetails__summary">
                <span className="code jsonDetails__label">{label}</span>
                <span className="code jsonDetails__preview">{compact}</span>
            </summary>
            <pre className="pre pre--mini pre--wrap">{pretty}</pre>
        </details>
    );
}

/** Fully themed dropdown (no native <select>) */
function PresetDropdown({ value, options, onChange, disabled }) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef(null);
    const selected = options.find((o) => o.id === value);

    // close when clicking outside
    useEffect(() => {
        const onDoc = (e) => {
            const root = rootRef.current;
            if (!root) return;
            if (!root.contains(e.target)) setOpen(false);
        };
        document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, []);

    // basic keyboard support
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => {
            if (e.key === "Escape") setOpen(false);
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [open]);

    return (
        <div ref={rootRef} className={`dd ${open ? "dd--open" : ""} ${disabled ? "dd--disabled" : ""}`}>
            <button
                type="button"
                className="dd__btn"
                onClick={() => !disabled && setOpen((v) => !v)}
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <span className="dd__label">{selected ? selected.name : "Select preset"}</span>
                <span className="dd__chev" aria-hidden="true">
          ▾
        </span>
            </button>

            {open && !disabled && (
                <>
                    <div className="dd__backdrop" aria-hidden="true" onClick={() => setOpen(false)} />

                    <div className="dd__menu" role="listbox">
                        {options.map((p) => (
                            <button
                                key={p.id}
                                type="button"
                                className={`dd__item ${p.id === value ? "dd__item--active" : ""}`}
                                onClick={() => {
                                    onChange(p.id);
                                    setOpen(false);
                                }}
                                role="option"
                                aria-selected={p.id === value}
                            >
                                <div className="dd__itemName">
                                    {p.name} {p.id.startsWith("user:") ? <span className="dd__tag">saved</span> : null}
                                </div>
                                <div className="dd__itemMeta">{p.id}</div>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

function isReportOk(rep) {
    if (rep?.skipped) return false;
    const s = rep?.summary || {};
    return (s.fieldDiffs ?? 0) === 0 && (s.missingInOther ?? 0) === 0 && (s.missingInPrimary ?? 0) === 0;
}

function ApiForm({ title, api, setApi, resetKey, baseUrl, showEffectiveUrl = true }) {
    const [headers, setHeaders] = useState(() => objToKv(api.headers));
    const [queryOverrides, setQueryOverrides] = useState(() => objToKv(api.query));
    const [queryKeyMap, setQueryKeyMap] = useState(() => objToKv(api.queryKeyMap));
    const [fieldMap, setFieldMap] = useState(() => objToKv(api.fieldMap));

    useEffect(() => {
        setHeaders(objToKv(api.headers));
        setQueryOverrides(objToKv(api.query));
        setQueryKeyMap(objToKv(api.queryKeyMap));
        setFieldMap(objToKv(api.fieldMap));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resetKey]);

    useEffect(() => {
        const nextHeaders = kvToObj(headers);
        setApi((prev) => {
            if (shallowEqualObj(prev.headers || {}, nextHeaders)) return prev;
            return { ...prev, headers: nextHeaders };
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [headers]);

    useEffect(() => {
        const nextQuery = kvToObj(queryOverrides);
        setApi((prev) => {
            if (shallowEqualObj(prev.query || {}, nextQuery)) return prev;
            return { ...prev, query: nextQuery };
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [queryOverrides]);

    useEffect(() => {
        const nextMap = kvToObj(queryKeyMap);
        setApi((prev) => {
            if (shallowEqualObj(prev.queryKeyMap || {}, nextMap)) return prev;
            return { ...prev, queryKeyMap: nextMap };
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [queryKeyMap]);

    useEffect(() => {
        const nextFM = kvToObj(fieldMap);
        setApi((prev) => {
            if (shallowEqualObj(prev.fieldMap || {}, nextFM)) return prev;
            return { ...prev, fieldMap: nextFM };
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fieldMap]);

    return (
        <div className="card">
            <SectionHeader title={title} />

            <div className="grid-2">
                <div className="field">
                    <label>Name</label>
                    <input className="input" value={api.name || ""} onChange={(e) => setApi((p) => ({ ...p, name: e.target.value }))} />
                </div>

                <div className="field">
                    <label>Method</label>
                    <select className="select" value={api.method || "GET"} onChange={(e) => setApi((p) => ({ ...p, method: e.target.value }))}>
                        {METHODS.map((m) => (
                            <option key={m} value={m}>
                                {m}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="field" style={{ gridColumn: "1 / span 2" }}>
                    <label>URL (absolute or path like /agents)</label>
                    <input
                        className="input"
                        value={api.url || ""}
                        onChange={(e) => setApi((p) => ({ ...p, url: e.target.value }))}
                        placeholder="/agents or https://..."
                    />
                    {showEffectiveUrl ? (
                        <div className="apidiff__subtitle" style={{ marginTop: 6 }}>
                            Effective: <span className="code">{resolveUrl(api.url, baseUrl)}</span>
                        </div>
                    ) : null}
                </div>

                <div className="field" style={{ gridColumn: "1 / span 2" }}>
                    <label>Extract Path (empty = root array)</label>
                    <input className="input" value={api.extract || ""} onChange={(e) => setApi((p) => ({ ...p, extract: e.target.value }))} placeholder="e.g. data.items" />
                </div>
            </div>

            <div className="grid-2" style={{ marginTop: 12 }}>
                <KvEditor label="Headers (per-API overrides)" kvs={headers} setKvs={setHeaders} />
                <KvEditor label="Query Overrides (per-API token/extra)" kvs={queryOverrides} setKvs={setQueryOverrides} />
            </div>

            <div style={{ marginTop: 12 }}>
                <KvEditor
                    label="Query Key Map (sharedKey → apiKey)"
                    hint="Example: shared key 'access_token' maps to API-specific key 'token'."
                    kvs={queryKeyMap}
                    setKvs={setQueryKeyMap}
                />
            </div>

            <div style={{ marginTop: 12 }}>
                <KvEditor
                    label="Response Field Map (this API field → canonical field)"
                    hint={`Example: map StartTime → StartDate, EndTime → EndDate. Supports dot paths like "A.B" → "X.Y".`}
                    kvs={fieldMap}
                    setKvs={setFieldMap}
                />
            </div>
        </div>
    );
}

/** ---------------------------
 * Main
 * --------------------------*/
export default function ApiDiff() {
    const [reqName, setReqName] = useState("agents-compare");
    const [idKey, setIdKey] = useState("OCode");
    const [ignoreFields, setIgnoreFields] = useState("");
    const [compareFields, setCompareFields] = useState("");
    const [compareMode, setCompareMode] = useState("union");
    const [maxDiffs, setMaxDiffs] = useState(5000);
    const [timeoutSec, setTimeoutSec] = useState(20);

    const [sharedHeaders, setSharedHeaders] = useState([{ k: "accept", v: "application/json" }]);
    const [sharedQuery, setSharedQuery] = useState([{ k: "", v: "" }]);

    // ✅ NEW: runtime base URLs (you change once; presets keep only paths)
    const [primaryBaseUrl, setPrimaryBaseUrl] = useState(() => {
        return localStorage.getItem(LS_PRIMARY_BASE) || "https://6028f8364028.ngrok-free.app";
    });

    const [otherBaseUrl, setOtherBaseUrl] = useState(() => {
        return localStorage.getItem(LS_OTHER_BASE) || "http://api.joker88.club";
    });

    useEffect(() => {
        localStorage.setItem(LS_PRIMARY_BASE, primaryBaseUrl);
    }, [primaryBaseUrl]);

    useEffect(() => {
        localStorage.setItem(LS_OTHER_BASE, otherBaseUrl);
    }, [otherBaseUrl]);

    const [primary, setPrimary] = useState({
        name: "primary",
        method: "GET",
        url: "",
        headers: {},
        query: {},
        queryKeyMap: {},
        extract: "",
        fieldMap: {},
    });

    const [others, setOthers] = useState([
        {
            name: "other-1",
            method: "GET",
            url: "",
            headers: {},
            query: {},
            queryKeyMap: {},
            extract: "",
            fieldMap: {},
        },
    ]);

    const setOtherAt = useCallback(
        (idx) => (updater) => {
            setOthers((prev) =>
                prev.map((item, i) => {
                    if (i !== idx) return item;
                    return typeof updater === "function" ? updater(item) : updater;
                })
            );
        },
        []
    );

    const [builtinPresets, setBuiltinPresets] = useState([]);
    const [userPresets, setUserPresets] = useState([]);
    const allPresets = useMemo(() => [...builtinPresets, ...userPresets], [builtinPresets, userPresets]);

    const [selectedPresetId, setSelectedPresetId] = useState("");
    const [newPresetName, setNewPresetName] = useState("");

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/presets.json", { cache: "no-store" });
                const data = await res.json();
                if (Array.isArray(data)) setBuiltinPresets(data);
            } catch {
                setBuiltinPresets([]);
            }
        })();
    }, []);

    useEffect(() => {
        setUserPresets(loadUserPresets());
    }, []);

    function normalizeApiShape(api) {
        const a = api || {};
        return {
            name: a.name ?? "",
            method: a.method ?? "GET",
            url: a.url ?? "",
            headers: a.headers ?? {},
            query: a.query ?? {},
            queryKeyMap: a.queryKeyMap ?? {},
            extract: a.extract ?? "",
            fieldMap: a.fieldMap ?? {},
        };
    }

    function applyPreset(data) {
        setReqName(data.reqName ?? "");
        setIdKey(data.idKey ?? "OCode");
        setIgnoreFields(toCsvString(data.ignoreFields ?? ""));
        setCompareFields(toCsvString(data.compareFields ?? ""));
        setCompareMode(data.compareMode ?? "union");
        setMaxDiffs(data.maxDiffs ?? 5000);
        setTimeoutSec(data.timeoutSec ?? 20);
        setSharedHeaders(data.sharedHeaders ?? [{ k: "", v: "" }]);
        setSharedQuery(data.sharedQuery ?? [{ k: "", v: "" }]);
        setPrimary(normalizeApiShape(data.primary) || normalizeApiShape(null));
        setOthers((data.others ?? []).map(normalizeApiShape));
    }

    useEffect(() => {
        if (!selectedPresetId && allPresets.length > 0) {
            setSelectedPresetId(allPresets[0].id);
            applyPreset(allPresets[0].data);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allPresets.length]);

    function onSelectPreset(id) {
        setSelectedPresetId(id);
        const p = allPresets.find((x) => x.id === id);
        if (p) applyPreset(p.data);
    }

    function snapshotCurrentAsPreset() {
        return {
            reqName,
            idKey,
            ignoreFields,
            compareFields,
            compareMode,
            maxDiffs: Number(maxDiffs) || 0,
            timeoutSec: Number(timeoutSec) || 20,
            sharedHeaders,
            sharedQuery,
            primary,
            others,
        };
    }

    function saveCurrentPreset() {
        const name = (newPresetName || "").trim();
        if (!name) return alert("Enter a preset name.");
        const id = `user:${Date.now()}`;
        const preset = { id, name, data: snapshotCurrentAsPreset() };
        const next = [preset, ...userPresets];
        setUserPresets(next);
        saveUserPresets(next);
        setSelectedPresetId(id);
        setNewPresetName("");
    }

    function deleteSelectedPreset() {
        if (!selectedPresetId.startsWith("user:")) return alert("Only user presets can be deleted.");
        const next = userPresets.filter((p) => p.id !== selectedPresetId);
        setUserPresets(next);
        saveUserPresets(next);

        if (builtinPresets[0]) {
            setSelectedPresetId(builtinPresets[0].id);
            applyPreset(builtinPresets[0].data);
        } else if (next[0]) {
            setSelectedPresetId(next[0].id);
            applyPreset(next[0].data);
        } else {
            setSelectedPresetId("");
        }
    }

    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState("");

    async function runCompare() {
        setError("");
        setResult(null);
        setLoading(true);

        try {
            // ✅ resolve URLs at send-time (supports presets storing only paths)
            const resolvedPrimary = { ...primary, url: resolveUrl(primary.url, primaryBaseUrl) };
            const resolvedOthers = others.map((o) => ({ ...o, url: resolveUrl(o.url, otherBaseUrl) }));

            const payload = {
                name: reqName,
                idKey,
                ignoreFields: csvToArray(ignoreFields),
                compareFields: csvToArray(compareFields),
                compareMode,
                maxDiffs: Number(maxDiffs) || 0,
                timeoutSec: Number(timeoutSec) || 20,
                sharedHeaders: kvToObj(sharedHeaders),
                sharedQuery: kvToObj(sharedQuery),
                primary: resolvedPrimary,
                others: resolvedOthers,
            };

            const res = await fetch(`${API_BASE}/compare`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data?.detail || data?.error || "Request failed");
            setResult(data);
        } catch (e) {
            setError(String(e.message || e));
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="apidiff">
            <div className="apidiff__container">
                <div className="apidiff__header">
                    <div>
                        <h2 className="apidiff__title">API Diff</h2>
                        <p className="apidiff__subtitle">Compare payloads across multiple APIs with shared headers/query mapping.</p>
                    </div>
                    <span className="badge">
            Base: <span className="code">{API_BASE}</span>
          </span>
                </div>

                {/* ✅ NEW: Base URL inputs (primary + other) */}
                <div className="card" style={{ marginBottom: 14 }}>
                    <SectionHeader title="API Bases" right={<span className="badge">applies to relative preset URLs</span>} />
                    <div className="grid-2">
                        <div className="field">
                            <label>Go (New) URL</label>
                            <input
                                className="input"
                                value={primaryBaseUrl}
                                onChange={(e) => setPrimaryBaseUrl(e.target.value)}
                                placeholder="http://localhost:8080"
                            />
                        </div>

                        <div className="field">
                            <label>.NET (Joker) URL</label>
                            <input
                                className="input"
                                value={otherBaseUrl}
                                onChange={(e) => setOtherBaseUrl(e.target.value)}
                                placeholder="http://api.joker88.club"
                            />
                        </div>
                    </div>
                </div>

                <div className="card" style={{ marginBottom: 14 }}>
                    <SectionHeader title="Presets" right={<span className="badge">public + browser</span>} />
                    <div className="presetsRow">
                        <div className="field presetsRow__left">
                            <label>Preset</label>

                            <PresetDropdown value={selectedPresetId} options={allPresets} onChange={(id) => onSelectPreset(id)} disabled={allPresets.length === 0} />

                            <div />

                            <label>Save current as preset</label>
                            <div className="row row--nowrap row--tight">
                                <input className="input" value={newPresetName} onChange={(e) => setNewPresetName(e.target.value)} placeholder="Preset name" />
                                <button className="btn btn--primary" onClick={saveCurrentPreset}>
                                    Save
                                </button>
                                <button className="btn btn--danger" onClick={deleteSelectedPreset} disabled={!selectedPresetId.startsWith("user:")}>
                                    Delete
                                </button>
                            </div>

                            <div className="apidiff__subtitle" style={{ marginTop: 8 }}>
                                Edit presets in <span className="code">public/presets.json</span>. User presets are stored in your browser.
                            </div>

                            <div style={{ marginTop: 14 }} className="row">
                                <button className="btn btn--primary" onClick={runCompare} disabled={loading}>
                                    {loading ? "Comparing..." : "Compare"}
                                </button>
                                {loading ? <span className="badge">Working…</span> : null}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Result section */}
                <div>
                    {error ? <div className="alert">{error}</div> : null}

                    {result && (
                        <div style={{ marginTop: 16 }} className="stack">
                            <SectionHeader title="Result" right={<span className="badge">{result.length} report(s)</span>} />

                            {result.map((rep, idx) => {
                                const ok = isReportOk(rep);
                                const skipped = !!rep?.skipped;

                                return (
                                    <div key={idx} className={`card ${ok ? "card--ok" : "card--bad"}`}>
                                        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                                            <div style={{ fontWeight: 800 }}>
                                                {rep.caseName || "(case)"} — <span className="code">{rep.primary}</span> vs <span className="code">{rep.other}</span>
                                            </div>

                                            {skipped ? (
                                                <span className="badge badge--danger">SKIPPED</span>
                                            ) : rep.truncated ? (
                                                <span className="badge badge--danger">TRUNCATED</span>
                                            ) : ok ? (
                                                <span className="badge badge--ok">OK</span>
                                            ) : (
                                                <span className="badge badge--danger">DIFF</span>
                                            )}
                                        </div>

                                        {(rep.primaryFetchError || rep.otherFetchError) && (
                                            <div style={{ marginTop: 10 }} className="alert">
                                                <div style={{ fontWeight: 800, marginBottom: 6 }}>Fetch error</div>
                                                {rep.primaryFetchError ? (
                                                    <div>
                                                        <span className="code">primary</span>: {rep.primaryFetchError}
                                                    </div>
                                                ) : null}
                                                {rep.otherFetchError ? (
                                                    <div>
                                                        <span className="code">other</span>: {rep.otherFetchError}
                                                    </div>
                                                ) : null}
                                            </div>
                                        )}

                                        <pre className="pre">{safeStringify(rep.summary, 2)}</pre>

                                        {rep?.missingInOther != null && (
                                            <div style={{ marginTop: 15 }}>
                                                <div style={{ fontWeight: 800 }}>Missing in Joker (.NET)</div>
                                                <pre className="pre">{safeStringify(rep.missingInOther, 2)}</pre>
                                            </div>
                                        )}

                                        {rep?.missingInPrimary != null && (
                                            <div style={{ marginTop: 15 }}>
                                                <div style={{ fontWeight: 800 }}>Missing in New API (Go)</div>
                                                <pre className="pre">{safeStringify(rep.missingInPrimary, 2)}</pre>
                                            </div>
                                        )}

                                        <div style={{ marginTop: 12 }} className="stack">
                                            <details>
                                                <summary style={{ cursor: "pointer", fontWeight: 800 }}>Primary response (raw)</summary>
                                                <pre className="pre" style={{ maxHeight: 320, overflow: "auto" }}>
                          {safeStringify(rep.primaryRaw ?? null, 2)}
                        </pre>
                                            </details>

                                            <details>
                                                <summary style={{ cursor: "pointer", fontWeight: 800 }}>Other response (raw)</summary>
                                                <pre className="pre" style={{ maxHeight: 320, overflow: "auto" }}>
                          {safeStringify(rep.otherRaw ?? null, 2)}
                        </pre>
                                            </details>

                                            <details>
                                                <summary style={{ cursor: "pointer", fontWeight: 800 }}>Primary extracted items</summary>
                                                <pre className="pre" style={{ maxHeight: 320, overflow: "auto" }}>
                          {safeStringify(rep.primaryItems ?? null, 2)}
                        </pre>
                                            </details>

                                            <details>
                                                <summary style={{ cursor: "pointer", fontWeight: 800 }}>Other extracted items</summary>
                                                <pre className="pre" style={{ maxHeight: 320, overflow: "auto" }}>
                          {safeStringify(rep.otherItems ?? null, 2)}
                        </pre>
                                            </details>
                                        </div>

                                        {!skipped && rep.fieldDiffs?.length > 0 && (
                                            <div style={{ marginTop: 12 }} className="stack">
                                                <div className="row" style={{ justifyContent: "space-between" }}>
                                                    <div style={{ fontWeight: 800 }}>
                                                        Field diffs <span className="badge">up to 50</span>
                                                    </div>
                                                    <span className="badge">{rep.fieldDiffs.length} total</span>
                                                </div>

                                                <div className="tableWrap">
                                                    <table className="table">
                                                        <thead>
                                                        <tr>
                                                            <th>ID</th>
                                                            <th>Field</th>
                                                            <th>New API (Go)</th>
                                                            <th>Joker (.NET)</th>
                                                            <th>Reason</th>
                                                        </tr>
                                                        </thead>
                                                        <tbody>
                                                        {rep.fieldDiffs.slice(0, 50).map((d, i) => (
                                                            <tr key={i}>
                                                                <td>
                                                                    <span className="code">{d.id}</span>
                                                                </td>
                                                                <td>
                                                                    <span className="code">{d.field}</span>
                                                                </td>
                                                                <td>
                                                                    <JsonCell value={d.primaryValue} />
                                                                </td>
                                                                <td>
                                                                    <JsonCell value={d.otherValue} />
                                                                </td>
                                                                <td>{d.reason}</td>
                                                            </tr>
                                                        ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}

                                        {rep.notes?.length > 0 && (
                                            <div style={{ marginTop: 12 }}>
                                                <div style={{ fontWeight: 800 }}>Notes</div>
                                                <pre className="pre">{rep.notes.join("\n")}</pre>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div style={{ marginTop: 14 }} className="card stack">
                    <SectionHeader title="Settings" />
                    <div className="grid-4">
                        <div className="field">
                            <label>Case name</label>
                            <input className="input" value={reqName} onChange={(e) => setReqName(e.target.value)} />
                        </div>
                        <div className="field">
                            <label>ID key</label>
                            <input className="input" value={idKey} onChange={(e) => setIdKey(e.target.value)} />
                        </div>
                        <div className="field">
                            <label>Compare mode</label>
                            <select className="select" value={compareMode} onChange={(e) => setCompareMode(e.target.value)}>
                                <option value="common">common</option>
                                <option value="union">union</option>
                            </select>
                        </div>
                        <div className="field">
                            <label>Max diffs (0=unlimited)</label>
                            <input className="input" type="number" value={maxDiffs} onChange={(e) => setMaxDiffs(e.target.value)} />
                        </div>
                    </div>

                    <div className="grid-2">
                        <div className="field">
                            <label>Ignore fields (comma)</label>
                            <input className="input" value={ignoreFields} onChange={(e) => setIgnoreFields(e.target.value)} />
                        </div>
                        <div className="field">
                            <label>Compare fields (comma, optional)</label>
                            <input className="input" value={compareFields} onChange={(e) => setCompareFields(e.target.value)} />
                        </div>
                    </div>

                    <div className="field" style={{ maxWidth: 240 }}>
                        <label>Timeout (sec)</label>
                        <input className="input" type="number" value={timeoutSec} onChange={(e) => setTimeoutSec(e.target.value)} />
                    </div>
                </div>

                <div style={{ marginTop: 14 }} className="grid-2">
                    <KvEditor label="Shared Headers" kvs={sharedHeaders} setKvs={setSharedHeaders} />
                    <KvEditor label="Shared Query params" kvs={sharedQuery} setKvs={setSharedQuery} />
                </div>

                <div style={{ marginTop: 14 }}>
                    <ApiForm
                        title="A) Primary API"
                        api={primary}
                        setApi={setPrimary}
                        resetKey={selectedPresetId}
                        baseUrl={primaryBaseUrl}
                    />
                </div>

                <div style={{ marginTop: 14 }} className="card">
                    <SectionHeader
                        title="B) Other APIs"
                        right={
                            <button
                                className="btn btn--sm"
                                onClick={() =>
                                    setOthers((prev) => [
                                        ...prev,
                                        {
                                            name: `other-${prev.length + 1}`,
                                            method: "GET",
                                            url: "",
                                            headers: {},
                                            query: {},
                                            queryKeyMap: {},
                                            extract: "",
                                            fieldMap: {},
                                        },
                                    ])
                                }
                            >
                                + Add other
                            </button>
                        }
                    />

                    <div className="stack" style={{ marginTop: 12 }}>
                        {others.map((api, idx) => (
                            <div key={idx} className="stack">
                                <ApiForm title={`Other #${idx + 1}`} api={api} setApi={setOtherAt(idx)} resetKey={selectedPresetId} baseUrl={otherBaseUrl} />
                                <div className="row" style={{ justifyContent: "flex-end" }}>
                                    <button className="btn btn--danger" onClick={() => setOthers((prev) => prev.filter((_, i) => i !== idx))} disabled={others.length === 1}>
                                        Remove this other
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
