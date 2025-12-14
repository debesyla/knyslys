chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "addDomains") {
        chrome.storage.local.get(["domains_map"], (res) => {
            let map = res.domains_map || {};
            let changed = false;

            for (const d of msg.domains) {
                if (!map[d]) {
                    map[d] = true;
                    changed = true;
                }
            }

            if (changed) {
                chrome.storage.local.set({ domains_map: map }, () => {
                    const count = Object.keys(map).length;
                    const badge = count > 999 ? Math.floor(count/1000) + "K" : String(count);
                    chrome.action.setBadgeText({ text: badge });
                });
            }
        });
    }
});

chrome.storage.local.get(["domains_map"], res => {
    const count = Object.keys(res.domains_map || {}).length;
    const badge = count > 999 ? Math.floor(count/1000) + "K" : String(count);
    chrome.action.setBadgeText({ text: badge });
});
