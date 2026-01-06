import {useState, useEffect, useRef} from "react";
import {useLocation, useNavigate} from "react-router-dom";
import {saveToHistory, loadHistory} from "../utils/history";
import CopyCell from "../components/CopyCell";
import {BASE_URL} from "../utils/config";
import "../PersonInfo.css";

function PersonInfo() {
    const [linkCopied, setLinkCopied] = useState(false);
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();

    const [data, setData] = useState(null);
    const [params, setParams] = useState({
        PersonID: [""],
        PersonOCode: [""],
        Username: [""],
    });

    const [history, setHistory] = useState([]);
    const hasInitialQueryParams = useRef(false);

    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const newParams = {PersonID: [], PersonOCode: [], Username: []};

        let hasQuery = false;
        for (const key of Object.keys(newParams)) {
            const values = searchParams.getAll(key);
            if (values.length > 0) {
                newParams[key] = values;
                hasQuery = true;
            }
        }

        if (hasQuery) hasInitialQueryParams.current = true;

        setParams((prev) => ({...prev, ...newParams}));

        setHistory(loadHistory());
    }, [location.search]);

    useEffect(() => {
        if (!hasInitialQueryParams.current) return;

        const hasAnyValue = Object.values(params).some((arr) =>
            arr.some((val) => val.trim() !== "")
        );

        if (hasAnyValue) {
            fetchToken();
            hasInitialQueryParams.current = false;
            navigate("/person", {replace: true});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params]);

    const handleParamChange = (name, index, value) => {
        setParams((prev) => {
            const updated = [...prev[name]];
            updated[index] = value;
            return {...prev, [name]: updated};
        });
    };

    const addParamField = (name) => {
        setParams((prev) => ({...prev, [name]: [...prev[name], ""]}));
    };

    const removeParamField = (name, index) => {
        setParams((prev) => {
            const updated = [...prev[name]];
            updated.splice(index, 1);
            return {...prev, [name]: updated.length ? updated : [""]};
        });
    };

    const fetchToken = async () => {
        const queryParams = [];

        for (const [key, values] of Object.entries(params)) {
            for (const val of values) {
                if (val.trim() !== "") queryParams.push([key, val]);
            }
        }

        if (queryParams.length === 0) {
            alert("Please enter at least one value.");
            return;
        }

        const query = new URLSearchParams(queryParams).toString();
        setLoading(true);

        try {
            const res = await fetch(`${BASE_URL}/token?${query}`, {
                method: "GET",
                headers: {"ngrok-skip-browser-warning": "true"},
            });
            if (!res.ok) throw new Error(`Server error: ${res.status}`);
            const json = await res.json();
            setData(json);

            saveToHistory(params);
            setHistory(loadHistory());
        } catch (error) {
            console.error("❌ Fetch failed:", error);
            alert("Failed to fetch data. See console.");
        } finally {
            setLoading(false);
        }
    };

    const applyHistoryItem = (itemParams) => setParams(itemParams);

    const handleDeleteHistoryItem = (timestamp) => {
        const updated = history.filter((item) => item.timestamp !== timestamp);
        localStorage.setItem("person_history", JSON.stringify(updated));
        setHistory(updated);
    };

    const handleClearAllHistory = () => {
        localStorage.removeItem("person_history");
        setHistory([]);
    };

    const generateShareURL = () => {
        const url = new URL(window.location.href);
        url.search = "";

        for (const [key, values] of Object.entries(params)) {
            values
                .filter((v) => v.trim() !== "")
                .forEach((val) => url.searchParams.append(key, val));
        }

        navigator.clipboard
            .writeText(url.toString())
            .then(() => {
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 1000);
            })
            .catch(() => console.error("❌ Failed to copy link."));
    };

    const clearAllInputs = () => {
        setParams({PersonID: [""], PersonOCode: [""], Username: [""]});
        setData(null);
        navigate("/person", {replace: true});
    };

    return (
        <div className="pageShell personPage">
            <div className="pageContainer">
                <div className="pageCard">
                    <div className="pageHead">
                        <div>
                            <h1 className="pageTitle">Person Lookup</h1>
                            <p className="pageSub">Search by PersonID / PersonOCode / Username.</p>
                        </div>

                        <div className="row" style={{gap: 10}}>
                            <button
                                onClick={fetchToken}
                                className={`btn btn--primary ${loading ? "isLoading" : ""}`}
                                disabled={loading}
                            >
                                {loading ? (
                                    <span className="row" style={{gap: 8}}>
                    <span className="spinner"/>
                    Loading...
                  </span>
                                ) : (
                                    "Search"
                                )}
                            </button>

                            <button onClick={clearAllInputs} className="btn">
                                Clear
                            </button>

                            <div className="shareWrap">
                                <button onClick={generateShareURL} className="btn">
                                    Share
                                </button>
                                {linkCopied && <div className="toastMini">Copied link!</div>}
                            </div>
                        </div>
                    </div>

                    <div className="grid3" style={{marginTop: 14}}>
                        {["PersonID", "PersonOCode", "Username"].map((field) => (
                            <div key={field} className="section">
                                <div className="sectionHead">
                                    <div className="sectionHeadLeft">
                                      <div className="sectionTitle">{field}</div>
                                    </div>
                                </div>


                                <div className="stack">
                                    {params[field].map((val, idx) => (
                                        <div key={idx} className="rowInput">
                                            <input
                                                className="input"
                                                type="text"
                                                inputMode={field === "PersonID" ? "numeric" : "text"}
                                                value={val}
                                                onChange={(e) => {
                                                    let value = e.target.value;
                                                    if (field === "PersonID") value = value.replace(/[^0-9-]/g, "");
                                                    handleParamChange(field, idx, value);
                                                }}
                                                placeholder={`${field} #${idx + 1}`}
                                            />
                                            <button
                                                className="btn btn--ghost btn--icon"
                                                onClick={() => removeParamField(field, idx)}
                                                title="Remove"
                                                disabled={params[field].length === 1}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div className="sectionHead" style={{marginTop: 10}}>
                                    <div className="sectionHeadLeft">
                                        <button className="btn btn--sm" onClick={() => addParamField(field)}>+ Add</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Response */}
                    {data?.data?.length > 0 && (
                        <div className="section" style={{marginTop: 18}}>
                            <div className="sectionHead">
                                <div className="sectionTitle">Response</div>
                                <span className="badge">{data.data.length} row(s)</span>
                            </div>

                            <div className="tableWrap">
                                <table className="table personTable">
                                    <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Type</th>
                                        <th>Username</th>
                                        <th>Person ID & OCode</th>
                                        <th>Session</th>
                                        <th>Upline</th>
                                        <th>Currency</th>
                                        <th>PersonLines</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {data.data.map((item, idx) => {
                                        const offlineSession =
                                            String(item.SessionID || "").includes("OFFLINE") ||
                                            String(item.SessionOCode || "").includes("OFFLINE");

                                        return (
                                            <tr key={idx}>
                                                <CopyCell copyValue={JSON.stringify(item, null, 2)}>{idx + 1}</CopyCell>
                                                <CopyCell>{item.Type}</CopyCell>
                                                <CopyCell>{item.Username}</CopyCell>

                                                <td>
                                                    <div className="cellStack">
                                                        <CopyCell as="div">{item.PersonID}</CopyCell>
                                                        <CopyCell as="div">{item.PersonOCode}</CopyCell>
                                                    </div>
                                                </td>

                                                <td>
                                                    <div className="cellStack">
                                                        <CopyCell as="div" className={offlineSession ? "pillDanger" : ""}>
                                                            {item.SessionID}
                                                        </CopyCell>
                                                        <CopyCell as="div" className={offlineSession ? "pillDanger" : ""}>
                                                            {item.SessionOCode}
                                                        </CopyCell>
                                                    </div>
                                                </td>

                                                <td>
                                                    <div className="cellStack">
                                                        <CopyCell as="div">{item.UplineID}</CopyCell>
                                                        <CopyCell as="div">{item.UplineOCode}</CopyCell>
                                                    </div>
                                                </td>

                                                <CopyCell>{item.CurrencyCode}</CopyCell>

                                                <td className="monoSmall">
                                                    {Array.isArray(item.PersonLines) ? item.PersonLines.join("\n") : ""}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* History */}
                    {history.length > 0 && (
                        <div className="section" style={{marginTop: 18}}>
                            <div className="sectionHead">
                                <div className="sectionTitle">History</div>
                                <div className="row" style={{gap: 10}}>
                                    <span className="badge">click to reuse</span>
                                    <button onClick={handleClearAllHistory} className="btn btn--danger btn--sm">
                                        Clear All
                                    </button>
                                </div>
                            </div>

                            <div className="stack">
                                {history.slice(0, 15).map((entry) => (
                                    <div key={entry.timestamp} className="historyCard">
                                        <div
                                            className="historyRow__body"
                                            onClick={() => applyHistoryItem(entry.params)}
                                            role="button"
                                            tabIndex={0}
                                        >
                                            {Object.entries(entry.params)
                                                .filter(([_, values]) => values.some((v) => v.trim() !== ""))
                                                .map(([key, values]) => {
                                                    const nonEmpty = values.filter((v) => v.trim() !== "");
                                                    if (nonEmpty.length === 0) return null;
                                                    return (
                                                        <div key={key} className="historyLine">
                                                            <span className="historyKey">{key}</span>
                                                            <span className="historyValue">{nonEmpty.join(" ")}</span>
                                                        </div>
                                                    );
                                                })}
                                        </div>

                                        <button
                                            onClick={() => handleDeleteHistoryItem(entry.timestamp)}
                                            className="btn btn--ghost btn--icon"
                                            title="Delete this entry"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default PersonInfo;
