import { useState } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import Toast from "./components/Toast";
import PersonInfo from "./pages/PersonInfo";
import OCodePage from "./pages/OCodePage";
import ApiDiff from "./pages/ApiDiff.jsx";
import { BASE_URL } from "./utils/config";
import "./App.css";

function App() {
    const [toast, setToast] = useState({ message: "", type: "info" });
    const location = useLocation();

    const showToast = (message, type = "info") => {
        setToast({ message, type });
        setTimeout(() => setToast({ message: "", type: "info" }), 3000);
    };

    const handleClearLogs = async () => {
        try {
            const res = await fetch(`${BASE_URL}/clear-log`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to clear logs");

            const json = await res.json();
            const logs = json?.data || [];
            const count = logs.length;

            let msg = "✅ Nothing to clean";
            if (count > 0) {
                const bullets = logs
                    .slice(0, 15)
                    .map((f) => `- ${f.split("/").pop()}`)
                    .join("\n");
                msg = `🧹 Cleared ${count} logs:\n${bullets}${count > 15 ? `\n...` : ""}`;
            }

            showToast(msg, "success");
            console.log("✅ Logs cleared:", logs);
        } catch (error) {
            console.error("❌ Clear log failed:", error);
            showToast("❌ Failed to clear logs", "error");
        }
    };

    const tools = [
        {
            path: "/person",
            title: "Person Lookup",
            description:
                "Search by Username, PersonID or PersonOCode and view sessionOCode (Token), upline, and more.",
            image: "https://i.postimg.cc/wjQQ82xn/cat-search.gif",
        },
        {
            path: "/ocode",
            title: "OCode Converter",
            description: "Quickly encode/decode between string/int and OCode.",
            image: "https://i.postimg.cc/2jXbqQvZ/cat-working.gif",
        },
        {
            path: "/apidiff",
            title: "APIs Comparison",
            description:
                "Compare 1 “primary” API response vs N other APIs, even when JSON shapes differ.",
            image: "https://i.postimg.cc/50WjjBXN/compare-cat.gif",
        },
    ];

    const isActive = (path) =>
        location.pathname === path || (path === "/" && location.pathname === "/");

    return (
        <div className="appShell">
            {/* Toast */}
            <Toast message={toast.message} type={toast.type} />

            {/* Header */}
            <header className="appHeader">
                <div className="appHeader__inner">
                    <Link to="/" className="appBrand">
                        <span className="appBrand__dot" />
                        Tommi Tools
                    </Link>

                    <nav className="appNav">
                        <Link
                            to="/person"
                            className={`appNavLink ${isActive("/person") ? "isActive" : ""}`}
                        >
                            Person
                        </Link>
                        <Link
                            to="/ocode"
                            className={`appNavLink ${isActive("/ocode") ? "isActive" : ""}`}
                        >
                            OCode
                        </Link>
                        <Link
                            to="/apidiff"
                            className={`appNavLink ${isActive("/apidiff") ? "isActive" : ""}`}
                        >
                            API Diff
                        </Link>

                        <button onClick={handleClearLogs} className="appNavBtn" title="Clear Logs">
                            🧹
                        </button>
                    </nav>
                </div>
            </header>

            {/* Page Content */}
            <main className="appMain">
                <Routes>
                    <Route path="/person" element={<PersonInfo />} />
                    <Route path="/ocode" element={<OCodePage />} />
                    <Route path="/apidiff" element={<ApiDiff />} />
                    <Route
                        path="*"
                        element={
                            <div className="appHome">
                                <div className="appGrid">
                                    {tools.map((tool, idx) => (
                                        <Link key={idx} to={tool.path} className="appCard">
                                            <img src={tool.image} alt={tool.title} className="appCard__img" />
                                            <div className="appCard__body">
                                                <h3 className="appCard__title">{tool.title}</h3>
                                                <p className="appCard__desc">{tool.description}</p>
                                                <div className="appCard__cta">
                                                    <span className="appPill">Open</span>
                                                    <span className="appArrow">→</span>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        }
                    />
                </Routes>
            </main>

            {/* Footer */}
            <footer className="appFooter">
                Copyright © 2025 <span className="appFooter__brand">tommitoan</span>
            </footer>
        </div>
    );
}

export default App;
