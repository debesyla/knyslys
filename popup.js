document.addEventListener("DOMContentLoaded", () => {
    const countEl = document.getElementById("count");
    const exportBtn = document.getElementById("export");
    const clearBtn = document.getElementById("clear");
    const confirmBox = document.getElementById("confirm");
    const confirmYes = document.getElementById("confirm-yes");
    const confirmCancel = document.getElementById("confirm-cancel");

    chrome.storage.local.get(["domains_map"], (res) => {
        const map = res.domains_map || {};
        countEl.textContent = "Rasta tiek domenų: " + Object.keys(map).length;
    });

    exportBtn.onclick = () => {
        chrome.storage.local.get(["domains_map"], (res) => {
            const list = Object.keys(res.domains_map || {}).sort().join("\n");
            const blob = new Blob([list], { type: "text/plain" });
            const url = URL.createObjectURL(blob);

            const now = new Date();
            const y = now.getFullYear();
            const m = String(now.getMonth() + 1).padStart(2, "0");
            const d = String(now.getDate()).padStart(2, "0");
            const filename = `knyslys_${y}${m}${d}.txt`;

            const originalLabel = exportBtn.textContent;

            chrome.downloads.download({ url, filename }, (downloadId) => {
                if (chrome.runtime.lastError || typeof downloadId !== "number") {
                    // On failure, keep original label and return
                    return;
                }

                exportBtn.textContent = "Išsaugota!";
                setTimeout(() => {
                    exportBtn.textContent = originalLabel;
                }, 3000);
            });
        });
    };

    function showConfirm() {
        confirmBox.classList.remove("hidden");
        clearBtn.disabled = true;
        exportBtn.disabled = true;
    }

    function hideConfirm() {
        confirmBox.classList.add("hidden");
        clearBtn.disabled = false;
        exportBtn.disabled = false;
    }

    clearBtn.onclick = () => {
        showConfirm();
    };

    confirmCancel.onclick = () => {
        hideConfirm();
    };

    confirmYes.onclick = () => {
        chrome.storage.local.set({ domains_map: {} }, () => {
            countEl.textContent = "Rasta tiek domenų: 0";
            chrome.action.setBadgeText({ text: "0" });
            hideConfirm();
        });
    };
});
