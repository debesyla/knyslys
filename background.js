let updateBadgeTimer = null;
let cachedDomainCount = 0;

// Load initial count once
chrome.storage.local.get(["domains_map"], res => {
    cachedDomainCount = Object.keys(res.domains_map || {}).length;
    const badge = cachedDomainCount > 999 ? (cachedDomainCount/1000).toFixed(1) + "K" : String(cachedDomainCount);
    chrome.action.setBadgeText({ text: badge });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "addDomains" && Array.isArray(msg.domains)) {
        chrome.storage.local.get(["domains_map"], (res) => {
            let map = res.domains_map || {};
            let changed = false;
            let addedCount = 0;

            for (const d of msg.domains) {
                if (d && typeof d === 'string' && !map[d]) {
                    map[d] = true;
                    changed = true;
                    addedCount++;
                }
            }

            if (changed) {
                // Batch writes - don't update badge on every message
                chrome.storage.local.set({ domains_map: map });
                cachedDomainCount += addedCount;

                // Only update badge if count changed significantly
                // @TEMPORARY: for testing purposes, reduce thresholds
                // if (addedCount >= 5 || cachedDomainCount % 10 === 0) {
                if (addedCount >= 3 || cachedDomainCount % 5 === 0) {
                    clearTimeout(updateBadgeTimer);
                    updateBadgeTimer = setTimeout(() => {
                        const count = cachedDomainCount;
                        const badge = count > 999 ? (count/1000).toFixed(1) + "K" : String(count);
                        chrome.action.setBadgeText({ text: badge });
                    }, 800);
                }
            }
        });
    }
});
