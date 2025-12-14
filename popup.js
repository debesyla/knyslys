document.addEventListener("DOMContentLoaded", () => {
    const countEl = document.getElementById("count");
    const exportBtn = document.getElementById("export");
    const clearBtn = document.getElementById("clear");

    chrome.storage.local.get(["domains_map"], (res) => {
        const map = res.domains_map || {};
        countEl.textContent = "Saugoma: " + Object.keys(map).length;
    });

    exportBtn.onclick = () => {
        chrome.storage.local.get(["domains_map"], (res) => {
            const list = Object.keys(res.domains_map || {}).sort().join("\n");
            const blob = new Blob([list], { type: "text/plain" });
            const url = URL.createObjectURL(blob);

            chrome.downloads.download({
                url,
                filename: "knyslys_domenai.txt"
            });
        });
    };

    clearBtn.onclick = () => {
        chrome.storage.local.set({ domains_map: {} }, () => {
            countEl.textContent = "Rasta tiek domenų: 0";
            chrome.action.setBadgeText({ text: "0" });
        });
    };
});
