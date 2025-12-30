function Toast({ message, type = "info" }) {
    if (!message) return null;

    const tone =
        type === "success" ? "toast--ok" : type === "error" ? "toast--err" : "toast--info";

    return (
        <div className={`toast ${tone}`} role="status" aria-live="polite">
            {message}
        </div>
    );
}

export default Toast;
