const STORAGE_KEY = "person_history";

export const loadHistory = () => {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
};

export const saveToHistory = (params) => {
    const history = loadHistory();

    // Avoid saving duplicates
    const isDuplicate = history.some(
        (item) => JSON.stringify(item.params) === JSON.stringify(params)
    );
    if (isDuplicate) return;

    const updated = [
        { timestamp: Date.now(), params },
        ...history.slice(0, 19), // Limit to 20 entries
    ];

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};
