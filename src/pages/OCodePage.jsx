import { useState } from "react";
import CopyCell from "../components/CopyCell";
import { BASE_URL } from "../utils/config";

function OCodePage() {
    const [inputs, setInputs] = useState(["", ""]);
    const [result, setResult] = useState([]);

    const handleChange = (index, value) => {
        setInputs((prev) => {
            const next = [...prev];
            next[index] = value;
            return next;
        });
    };

    const addInput = () => setInputs((prev) => [...prev, ""]);

    const removeInput = (index) => {
        setInputs((prev) => {
            const next = [...prev];
            next.splice(index, 1);
            return next.length ? next : [""];
        });
    };

    const fetchOCode = async () => {
        const query = inputs
            .filter((val) => val.trim() !== "")
            .map((f) => `f=${encodeURIComponent(f)}`)
            .join("&");

        if (!query) {
            alert("Please enter at least one value.");
            return;
        }

        try {
            const res = await fetch(`${BASE_URL}/ocode?${query}`, {
                method: "GET",
                headers: { "ngrok-skip-browser-warning": "true" },
            });
            if (!res.ok) throw new Error("Server error");
            const json = await res.json();
            setResult(json.result || []);
        } catch (err) {
            console.error(err);
            alert("Failed to fetch OCodes.");
        }
    };

    return (
        <div className="pageShell">
            <div className="pageContainer">
                <div className="pageCard">
                    <div className="pageHead">
                        <div>
                            <h1 className="pageTitle">OCode Converter</h1>
                            <p className="pageSub">
                                Paste IDs (string/int) and convert to OCode (or decode depending on backend behavior).
                            </p>
                        </div>

                        <button className="btn btn--primary" onClick={fetchOCode}>
                            Convert
                        </button>
                    </div>

                    <div className="grid3">
                        {inputs.map((val, idx) => (
                            <div key={idx} className="rowInput">
                                <input
                                    value={val}
                                    onChange={(e) => handleChange(idx, e.target.value)}
                                    placeholder={`#${idx + 1}`}
                                    className="input"
                                />
                                <button
                                    onClick={() => removeInput(idx)}
                                    className="btn btn--ghost btn--icon"
                                    title="Remove"
                                    disabled={inputs.length === 1}
                                >
                                    ✕
                                </button>
                            </div>
                        ))}

                        <button onClick={addInput} className="btn btn--sm">
                            + Add ID
                        </button>
                    </div>

                    {result.length > 0 && (
                        <div className="section" style={{ marginTop: 16 }}>
                            <div className="sectionHead">
                                <div className="sectionTitle">Result</div>
                                <span className="badge">{result.length} row(s)</span>
                            </div>

                            <div className="tableWrap">
                                <table className="table">
                                    <thead>
                                    <tr>
                                        <th>Input</th>
                                        <th>Converted</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {result.map((item, idx) => (
                                        <tr key={idx}>
                                            <CopyCell>{item.from}</CopyCell>
                                            <CopyCell>{item.result}</CopyCell>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default OCodePage;
