const blacklist = [
    "facebook.com", "messenger.com", "instagram.com",
    "twitter.com", "x.com", "linkedin.com", "tiktok.com",
    "youtube.com", "gmail.com", "mail.google.com",
    "outlook.com", "live.com"
];

if (!blacklist.some(b => location.hostname.includes(b))) {
    // Save current page's domain if it's a .lt domain
    if (location.hostname.endsWith('.lt')) {
        const currentDomain = location.hostname.toLowerCase().replace(/^www\./, '');
        chrome.runtime.sendMessage({ type: "addDomains", domains: [currentDomain] });
    }

    const domainRegex = /([a-zA-Z0-9_-]+\.)+lt\b/gi;
    const emailRegex = /[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+\.lt)/gi;
    let debounceTimer = null;
    let pendingDomains = new Set();
    let processedNodes = new WeakSet(); // Track already scanned nodes
    const MAX_NODES_PER_SCAN = 50;
    const MAX_PENDING = 2000; // Stop if we've found tons of domains
    let domainCount = 0;
    let isActive = true;
    let isUserInteracting = false;
    let isTabVisible = !document.hidden;

    // Track tab visibility - pause scanning when tab is hidden
    document.addEventListener('visibilitychange', () => {
        isTabVisible = !document.hidden;
        if (!isTabVisible) {
            // Flush any pending domains before going inactive
            flushDomains();
        }
    });

    // Track user interaction - pause scanning during heavy user activity
    document.addEventListener('mousedown', () => { isUserInteracting = true; }, true);
    document.addEventListener('keydown', () => { isUserInteracting = true; }, true);
    document.addEventListener('mouseup', () => { isUserInteracting = false; }, true);
    document.addEventListener('keyup', () => { isUserInteracting = false; }, true);

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

    function isValidDomain(domain) {
        if (!domain) return false;
        // Split into labels (parts between dots)
        const labels = domain.split('.');
        for (const label of labels) {
            // Each label must be 2-63 characters
            if (label.length < 2 || label.length > 63) return false;
            // Can't have two hyphens in a row
            if (label.includes('--')) return false;
            // Can't end with hyphen
            if (label.endsWith('-')) return false;
            // Can't start with hyphen
            if (label.startsWith('-')) return false;
        }
        return true;
    }

    function extract(text) {
        if (!text || typeof text !== 'string' || text.length > 50000) return [];
        // Pre-filter: skip expensive regex if .lt doesn't exist
        if (!text.includes('.lt')) return [];
        const found = text.match(domainRegex);
        if (!found) return [];
        return found.map(normalize).filter(isValidDomain);
    }

    function extractEmails(html) {
        if (!html || typeof html !== 'string' || html.length > 50000) return [];
        // Pre-filter: skip expensive regex if .lt doesn't exist
        if (!html.includes('.lt')) return [];
        const emails = html.match(emailRegex);
        if (!emails) return [];
        return emails.map(e => normalize(e.split("@")[1])).filter(isValidDomain);
    }

    function scan(node) {
        if (!node || !node.nodeType || processedNodes.has(node)) return;
        if (pendingDomains.size >= MAX_PENDING) return; // Stop if we found many domains

        processedNodes.add(node);
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
            domainCount += domains.length;
            pendingDomains.clear();
            chrome.runtime.sendMessage({ type: "addDomains", domains });
        }
    }

    function debouncedFlush() {
        if (!isActive || isUserInteracting || !isTabVisible) return; // Skip during user interaction or hidden tab
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(flushDomains, 1500);
    }

    // Initial scan - but be more selective and use requestIdleCallback for better timing
    function performInitialScan() {
        const initialNodes = document.querySelectorAll("a[href]");
        if (initialNodes.length > 0) {
            // Limit initial scan to first 300 links
            const limit = Math.min(initialNodes.length, 300);
            for (let i = 0; i < limit; i++) {
                scan(initialNodes[i]);
            }
            flushDomains();
        }
    }

    // Use requestIdleCallback for initial scan if available
    if ('requestIdleCallback' in window) {
        requestIdleCallback(performInitialScan, { timeout: 3000 });
    } else {
        setTimeout(performInitialScan, 2000);
    }

    // Use less aggressive observer
    const obs = new MutationObserver(mutations => {
        if (!isActive || !isTabVisible) return; // Skip if tab is hidden

        let nodesToScan = 0;
        for (const m of mutations) {
            if (m.type === 'childList') {
                for (const n of m.addedNodes) {
                    if (nodesToScan < 20) { // Further reduced from 30
                        if (n.nodeType === 1 && !processedNodes.has(n)) {
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

    // Disable observer if page has extensive DOM activity
    let mutationCount = 0;
    const safetyInterval = setInterval(() => {
        if (mutationCount > 500) {
            obs.disconnect();
            isActive = false;
            clearInterval(safetyInterval);
            clearTimeout(debounceTimer);
            flushDomains();
        }
        mutationCount = 0;
    }, 5000);

    window.addEventListener('beforeunload', () => {
        obs.disconnect();
        clearInterval(safetyInterval);
        clearTimeout(debounceTimer);
        flushDomains();
        isActive = false;
    });
}
