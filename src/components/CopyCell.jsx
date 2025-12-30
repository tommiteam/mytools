import { useMemo, useState } from "react";

function CopyCell({ children, copyValue, className = "" }) {
    const [copied, setCopied] = useState(false);

    const text = useMemo(() => {
        if (typeof children === "string") return children;
        if (typeof children === "number") return String(children);
        return "";
    }, [children]);

    const isOffline = useMemo(() => {
        const s = String(copyValue ?? text ?? "").trim().toUpperCase();
        return s.includes("OFFLINE");
    }, [copyValue, text]);

    const handleClick = async () => {
        try {
            const val = copyValue ?? (typeof children === "string" ? children : String(children ?? ""));
            await navigator.clipboard.writeText(val);
            setCopied(true);
            setTimeout(() => setCopied(false), 900);
        } catch (err) {
            console.error("Failed to copy", err);
        }
    };

    return (
        <td
            className={`copyCell ${isOffline ? "copyCell--offline" : ""} ${className}`}
            onClick={handleClick}
            title="Click to copy"
            style={{ overflow: "visible", verticalAlign: "middle" }}
        >
            {copied && (
                <div className={`copyTip ${isOffline ? "copyTip--warn" : "copyTip--ok"}`}>
                    "Copied!"
                </div>
            )}

            <div className="copyCell__inner">
                <span className="copyCell__text">{children}</span>
            </div>
        </td>
    );
}

export default CopyCell;
