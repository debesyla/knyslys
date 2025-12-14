const blacklist = [
    "facebook.com", "messenger.com", "instagram.com",
    "twitter.com", "x.com", "linkedin.com", "tiktok.com",
    "youtube.com", "gmail.com", "mail.google.com",
    "outlook.com", "live.com"
];

if (!blacklist.some(b => location.hostname.includes(b))) {
    const domainRegex = /([a-zA-Z0-9_-]+\.)+lt\b/gi;
    const emailRegex = /[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+\.lt)/gi;
    let debounceTimer = null;
    let pendingDomains = new Set();
    const MAX_NODES_PER_SCAN = 50;

    function normalize(domain) {
        domain = domain.toLowerCase();
        domain = domain.replace(/^www\./, "");
        domain = domain.replace(/[.,;:!?]+$/, "");
        try {
            return new URL("http://" + domain).hostname;
        } catch {
            return domain;
        }
    }

    function extract(text) {
        if (!text || typeof text !== 'string') return [];
        const found = text.match(domainRegex);
        if (!found) return [];
        return found.map(normalize);
    }

    function extractEmails(html) {
        if (!html || typeof html !== 'string') return [];
        const emails = html.match(emailRegex);
        if (!emails) return [];
        return emails.map(e => normalize(e.split("@")[1]));
    }

    function scan(node) {
        if (!node || !node.nodeType) return;

        let domains = [];

        // Only process text nodes and elements
        if (node.nodeType === 3) {
            // Text node
            domains = domains.concat(extract(node.textContent));
        } else if (node.nodeType === 1) {
            // Element node - only scan direct href and limited text
            if (node.href) {
                domains = domains.concat(extract(node.href));
            }
            if (node.textContent && node.children.length < MAX_NODES_PER_SCAN) {
                domains = domains.concat(extract(node.textContent));
            }
            // Check emails in HTML only for certain tags
            if (node.tagName === 'A' || node.tagName === 'P' || node.tagName === 'DIV') {
                domains = domains.concat(extractEmails(node.innerHTML));
            }
        }

        // Add to pending set instead of sending immediately
        domains.forEach(d => pendingDomains.add(d));
    }

    function flushDomains() {
        if (pendingDomains.size > 0) {
            const domains = Array.from(pendingDomains);
            pendingDomains.clear();
            chrome.runtime.sendMessage({ type: "addDomains", domains });
        }
    }

    function debouncedFlush() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(flushDomains, 1000);
    }

    // Initial scan - but be more selective
    const initialNodes = document.querySelectorAll("a[href]");
    if (initialNodes.length > 0) {
        // Limit initial scan to first 500 links
        const limit = Math.min(initialNodes.length, 500);
        for (let i = 0; i < limit; i++) {
            scan(initialNodes[i]);
        }
        flushDomains();
    }

    // Use less aggressive observer
    const obs = new MutationObserver(mutations => {
        let nodesToScan = 0;
        for (const m of mutations) {
            if (m.type === 'childList') {
                for (const n of m.addedNodes) {
                    if (nodesToScan < 30) { // Limit nodes processed per batch
                        if (n.nodeType === 1) {
                            scan(n);
                            nodesToScan++;
                        }
                    }
                }
            }
        }
        debouncedFlush();
    });

    // Only observe body, don't use subtree on entire document
    // Use limited mutation types
    obs.observe(document.body, {
        childList: true,
        subtree: false,
        characterData: false,
        attributes: false
    });

    // Stop observer if page is getting hammered (safety check)
    let mutationCount = 0;
    const safetyInterval = setInterval(() => {
        mutationCount = 0;
    }, 5000);

    window.addEventListener('beforeunload', () => {
        obs.disconnect();
        clearInterval(safetyInterval);
        clearTimeout(debounceTimer);
    });
}
