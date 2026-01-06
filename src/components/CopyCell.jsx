import { useMemo, useState } from "react";

export default function CopyCell({
                                     as: Tag = "td",
                                     copyValue,
                                     className = "",
                                     children,
                                     title,
                                 }) {
    const [tip, setTip] = useState(null);

    const textToCopy = useMemo(() => {
        if (copyValue != null) return String(copyValue);

        // Best-effort fallback: copy plain text children
        if (typeof children === "string" || typeof children === "number") return String(children);

        return "";
    }, [copyValue, children]);

    const clickableProps =
        Tag === "div"
            ? { role: "button", tabIndex: 0 }
            : {};

    const onCopy = async () => {
        if (!textToCopy) return;

        try {
            await navigator.clipboard.writeText(textToCopy);
            setTip("Copied!");
            setTimeout(() => setTip(null), 800);
        } catch (e) {
            setTip("Copy failed");
            setTimeout(() => setTip(null), 900);
        }
    };

    const onKeyDown = (e) => {
        if (e.key === "Enter" || e.key === " ") onCopy();
    };

    return (
        <Tag
            className={`copyCell ${className}`}
            onClick={onCopy}
            onKeyDown={Tag === "div" ? onKeyDown : undefined}
            onMouseLeave={() => setTip(null)}
            title={title}
            {...clickableProps}
        >
            <div className="copyCell__inner">
                <span className="copyCell__text">{children}</span>
                {/*<span className="copyCell__badge">⧉</span>*/}
            </div>

            {tip && <div className={`copyTip ${tip === "Copied!" ? "copyTip--ok" : "copyTip--warn"}`}>{tip}</div>}
        </Tag>
    );
}
