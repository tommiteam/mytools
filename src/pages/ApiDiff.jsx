import { useEffect, useMemo, useState, useCallback } from "react";
import "../ApiDiff.css";
import { API_DIF_URL } from "../utils/config";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const API_BASE = API_DIF_URL;
const LS_KEY = "apidiff.presets.v1";

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

function ApiForm({ title, api, setApi }) {
    // local kv editors
    const [headers, setHeaders] = useState(() => objToKv(api.headers));
    const [queryOverrides, setQueryOverrides] = useState(() => objToKv(api.query));
    const [queryKeyMap, setQueryKeyMap] = useState(() => objToKv(api.queryKeyMap));

    // when switching api object, refresh local KV UI
    useEffect(() => {
        setHeaders(objToKv(api.headers));
        setQueryOverrides(objToKv(api.query));
        setQueryKeyMap(objToKv(api.queryKeyMap));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [api?.name]);

    // push local KV changes into api object (IMPORTANT)
    useEffect(() => {
        setApi((prev) => ({ ...prev, headers: kvToObj(headers) }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [headers]);

    useEffect(() => {
        setApi((prev) => ({ ...prev, query: kvToObj(queryOverrides) }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [queryOverrides]);

    useEffect(() => {
        setApi((prev) => ({ ...prev, queryKeyMap: kvToObj(queryKeyMap) }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [queryKeyMap]);

    return (
        <div className="card">
            <SectionHeader title={title} />

            <div className="grid-2">
                <div className="field">
                    <label>Name</label>
                    <input
                        className="input"
                        value={api.name || ""}
                        onChange={(e) => setApi((prev) => ({ ...prev, name: e.target.value }))}
                    />
                </div>

                <div className="field">
                    <label>Method</label>
                    <select
                        className="select"
                        value={api.method || "GET"}
                        onChange={(e) => setApi((prev) => ({ ...prev, method: e.target.value }))}
                    >
                        {METHODS.map((m) => (
                            <option key={m} value={m}>
                                {m}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="field" style={{ gridColumn: "1 / span 2" }}>
                    <label>URL</label>
                    <input
                        className="input"
                        value={api.url || ""}
                        onChange={(e) => setApi((prev) => ({ ...prev, url: e.target.value }))}
                        placeholder="https://..."
                    />
                </div>

                <div className="field" style={{ gridColumn: "1 / span 2" }}>
                    <label>Extract Path (empty = root array)</label>
                    <input
                        className="input"
                        value={api.extract || ""}
                        onChange={(e) => setApi((prev) => ({ ...prev, extract: e.target.value }))}
                        placeholder="e.g. data.items"
                    />
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
        </div>
    );
}

/** ---------------------------
 * Main
 * --------------------------*/
export default function ApiDiff() {
    // main state
    const [reqName, setReqName] = useState("agents-compare");
    const [idKey, setIdKey] = useState("OCode");
    const [ignoreFields, setIgnoreFields] = useState("");
    const [compareFields, setCompareFields] = useState("");
    const [compareMode, setCompareMode] = useState("union");
    const [maxDiffs, setMaxDiffs] = useState(5000);
    const [timeoutSec, setTimeoutSec] = useState(20);

    const [sharedHeaders, setSharedHeaders] = useState([{ k: "accept", v: "application/json" }]);
    const [sharedQuery, setSharedQuery] = useState([{ k: "", v: "" }]);

    const [primary, setPrimary] = useState({
        name: "primary",
        method: "GET",
        url: "",
        headers: {},
        query: {},
        queryKeyMap: {},
        extract: ""
    });

    const [others, setOthers] = useState([
        { name: "other-1", method: "GET", url: "", headers: {}, query: {}, queryKeyMap: {}, extract: "" }
    ]);

    // ✅ IMPORTANT: provide a true React-style setState for each other row
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

    // presets
    const [builtinPresets, setBuiltinPresets] = useState([]);
    const [userPresets, setUserPresets] = useState([]);
    const allPresets = useMemo(() => [...builtinPresets, ...userPresets], [builtinPresets, userPresets]);

    const [selectedPresetId, setSelectedPresetId] = useState("");
    const [newPresetName, setNewPresetName] = useState("");

    // load builtin from public/presets.json
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

    // load user presets
    useEffect(() => {
        setUserPresets(loadUserPresets());
    }, []);

    function applyPreset(data) {
        setReqName(data.reqName ?? "");
        setIdKey(data.idKey ?? "OCode");
        setIgnoreFields(data.ignoreFields ?? "");
        setCompareFields(data.compareFields ?? "");
        setCompareMode(data.compareMode ?? "union");
        setMaxDiffs(data.maxDiffs ?? 5000);
        setTimeoutSec(data.timeoutSec ?? 20);

        setSharedHeaders(data.sharedHeaders ?? [{ k: "", v: "" }]);
        setSharedQuery(data.sharedQuery ?? [{ k: "", v: "" }]);

        setPrimary(
            data.primary ?? {
                name: "primary",
                method: "GET",
                url: "",
                headers: {},
                query: {},
                queryKeyMap: {},
                extract: ""
            }
        );

        setOthers(data.others ?? []);
    }

    // choose first preset when available
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
            others
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

    // compare
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState("");

    async function runCompare() {
        setError("");
        setResult(null);
        setLoading(true);

        try {
            const payload = {
                name: reqName,
                idKey,
                ignoreFields: ignoreFields.split(",").map((s) => s.trim()).filter(Boolean),
                compareFields: compareFields.split(",").map((s) => s.trim()).filter(Boolean),
                compareMode,
                maxDiffs: Number(maxDiffs) || 0,
                timeoutSec: Number(timeoutSec) || 20,
                sharedHeaders: kvToObj(sharedHeaders),
                sharedQuery: kvToObj(sharedQuery),
                primary,
                others
            };

            // ✅ DEBUG: verify you have headers/query here
            console.log("API_DIFF payload =>", payload);

            const res = await fetch(`${API_BASE}/compare`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
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

                {/* Presets */}
                <div className="card" style={{ marginBottom: 14 }}>
                    <SectionHeader title="Presets" right={<span className="badge">public + browser</span>} />
                    <div className="grid-2" style={{ alignItems: "end" }}>
                        <div className="field">
                            <label>Preset</label>
                            <select
                                className="select"
                                value={selectedPresetId}
                                onChange={(e) => onSelectPreset(e.target.value)}
                                disabled={allPresets.length === 0}
                            >
                                {allPresets.length === 0 ? (
                                    <option value="">No presets loaded</option>
                                ) : (
                                    allPresets.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name}
                                            {p.id.startsWith("user:") ? " (saved)" : ""}
                                        </option>
                                    ))
                                )}
                            </select>
                            <div className="apidiff__subtitle" style={{ marginTop: 8 }}>
                                Edit presets in <span className="code">public/presets.json</span>. User presets are stored in your browser.
                            </div>
                        </div>

                        <div className="field">
                            <label>Save current as preset</label>
                            <div className="row">
                                <input
                                    className="input"
                                    value={newPresetName}
                                    onChange={(e) => setNewPresetName(e.target.value)}
                                    placeholder="Preset name"
                                />
                                <button className="btn btn--primary" onClick={saveCurrentPreset}>
                                    Save
                                </button>
                                <button className="btn btn--danger" onClick={deleteSelectedPreset} disabled={!selectedPresetId.startsWith("user:")}>
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Settings */}
                <div className="card stack">
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

                {/* Shared */}
                <div style={{ marginTop: 14 }} className="grid-2">
                    <KvEditor label="Shared Headers" kvs={sharedHeaders} setKvs={setSharedHeaders} />
                    <KvEditor label="Shared Query params" kvs={sharedQuery} setKvs={setSharedQuery} />
                </div>

                {/* APIs */}
                <div style={{ marginTop: 14 }}>
                    <ApiForm title="A) Primary API" api={primary} setApi={setPrimary} />
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
                                        { name: `other-${prev.length + 1}`, method: "GET", url: "", headers: {}, query: {}, queryKeyMap: {}, extract: "" }
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
                                <ApiForm title={`Other #${idx + 1}`} api={api} setApi={setOtherAt(idx)} />
                                <div className="row" style={{ justifyContent: "flex-end" }}>
                                    <button
                                        className="btn btn--danger"
                                        onClick={() => setOthers((prev) => prev.filter((_, i) => i !== idx))}
                                        disabled={others.length === 1}
                                    >
                                        Remove this other
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Run */}
                <div style={{ marginTop: 14 }} className="row">
                    <button className="btn btn--primary" onClick={runCompare} disabled={loading}>
                        {loading ? "Comparing..." : "Compare"}
                    </button>
                    {loading ? <span className="badge">Working…</span> : null}
                </div>

                {error ? <div className="alert">{error}</div> : null}

                {/* Results */}
                {result && (
                    <div style={{ marginTop: 16 }} className="stack">
                        <SectionHeader title="Result" right={<span className="badge">{result.length} report(s)</span>} />

                        {result.map((rep, idx) => (
                            <div key={idx} className="card">
                                <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                                    <div style={{ fontWeight: 800 }}>
                                        {rep.caseName || "(case)"} — <span className="code">{rep.primary}</span> vs{" "}
                                        <span className="code">{rep.other}</span>
                                    </div>
                                    {rep.truncated ? <span className="badge badge--danger">TRUNCATED</span> : <span className="badge">OK</span>}
                                </div>

                                <pre className="pre">{JSON.stringify(rep.summary, null, 2)}</pre>

                                {rep.fieldDiffs?.length > 0 && (
                                    <div style={{ marginTop: 12 }} className="stack">
                                        <div className="row" style={{ justifyContent: "space-between" }}>
                                            <div style={{ fontWeight: 800 }}>Field diffs <span className="badge">up to 50</span></div>
                                            <span className="badge">{rep.fieldDiffs.length} total</span>
                                        </div>

                                        <div className="tableWrap">
                                            <table className="table">
                                                <thead>
                                                <tr>
                                                    <th>ID</th>
                                                    <th>Field</th>
                                                    <th>Primary</th>
                                                    <th>Other</th>
                                                    <th>Reason</th>
                                                </tr>
                                                </thead>
                                                <tbody>
                                                {rep.fieldDiffs.slice(0, 50).map((d, i) => (
                                                    <tr key={i}>
                                                        <td><span className="code">{d.id}</span></td>
                                                        <td><span className="code">{d.field}</span></td>
                                                        <td><span className="code">{JSON.stringify(d.primaryValue)}</span></td>
                                                        <td><span className="code">{JSON.stringify(d.otherValue)}</span></td>
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
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
