const blacklist = [
    "facebook.com", "messenger.com", "instagram.com",
    "twitter.com", "x.com", "linkedin.com", "tiktok.com",
    "youtube.com", "gmail.com", "mail.google.com",
    "outlook.com", "live.com"
];

if (!blacklist.some(b => location.hostname.includes(b))) {
    const domainRegex = /([a-zA-Z0-9_-]+\.)+lt\b/gi;

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
        const found = text.match(domainRegex);
        if (!found) return [];
        return [...new Set(found.map(normalize))];
    }

    function scan(node) {
        let domains = [];

        if (node.innerText) domains = domains.concat(extract(node.innerText));

        const as = node.querySelectorAll("a[href]");
        as.forEach(a => {
            const href = a.href || "";
            domains = domains.concat(extract(href));
        });

        const emails = node.innerHTML.match(/[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+\.lt)/gi);
        if (emails) {
            for (const e of emails) {
                const part = e.split("@")[1];
                domains.push(normalize(part));
            }
        }

        domains = [...new Set(domains)];
        if (domains.length > 0) {
            chrome.runtime.sendMessage({ type: "addDomains", domains });
        }
    }

    scan(document.body);

    const obs = new MutationObserver(mutations => {
        for (const m of mutations) {
            for (const n of m.addedNodes) {
                if (n.nodeType === 1) scan(n);
            }
        }
    });

    obs.observe(document.body, { childList: true, subtree: true });
}
