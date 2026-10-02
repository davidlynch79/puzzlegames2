/*
 * Member gate for the paid Data Tools.
 *
 * Loaded at the top of <head> in treesheets.html and conceptmap.html.
 * The page is locked before it paints, then /api/verify-auth decides whether
 * the visitor still has an active subscription. The tool is only unlocked once
 * the server confirms the membership.
 */
(function () {
    var OVERLAY_ID = "member-gate-overlay";

    // Lock the page immediately, before anything paints.
    document.documentElement.classList.add("gated");

    function overlayMarkup(mode, message) {
        var isLocked = mode === "locked";
        return ''
            + '<div id="' + OVERLAY_ID + '" style="'
            + 'position:fixed;inset:0;z-index:2147483647;'
            + 'display:flex;align-items:center;justify-content:center;'
            + 'padding:24px;box-sizing:border-box;text-align:center;'
            + 'font-family:system-ui,-apple-system,Segoe UI,sans-serif;'
            + 'background:radial-gradient(ellipse at 15% 0%,#173a35 0,#101b1d 42%,#101318 100%);'
            + 'color:#edf4f1;">'
            + '<div style="max-width:520px;">'
            + '<p style="margin:0 0 10px;color:' + (isLocked ? '#f3c969' : '#71d7b1') + ';'
            + 'font-size:12px;font-weight:800;letter-spacing:.14em;">'
            + (isLocked ? 'MEMBERSHIP REQUIRED' : 'CHECKING MEMBERSHIP') + '</p>'
            + '<h1 style="margin:0 0 12px;color:#f1f5f3;font-size:28px;line-height:1.15;">'
            + (isLocked ? 'This tool is part of your membership' : 'One moment') + '</h1>'
            + '<p style="margin:0 0 20px;color:#b8c7c1;font-size:15px;line-height:1.6;">'
            + message + '</p>'
            + '<a href="index.html?login=required" style="display:inline-flex;align-items:center;'
            + 'justify-content:center;min-height:42px;padding:0 18px;border-radius:6px;'
            + 'background:#71d7b1;color:#09231a;font-weight:750;text-decoration:none;">'
            + 'Sign in to continue</a>'
            + '</div></div>';
    }

    function render(mode, message) {
        var existing = document.getElementById(OVERLAY_ID);
        if (existing) existing.parentNode.removeChild(existing);
        if (mode === "open") {
            document.documentElement.classList.remove("gated");
            return;
        }
        document.documentElement.appendChild(
            document.createRange().createContextualFragment(overlayMarkup(mode, message))
        );
    }

    window.MemberGate = {
        open: function () { render("open", ""); }
    };

    function start() {
        render("checking", "Verifying your active subscription\u2026");
        fetch("/api/verify-auth", {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store"
        })
            .then(function (response) {
                if (!response.ok) throw new Error("not_verified");
                return response.json().catch(function () { return {}; });
            })
            .then(function () {
                render("open", "");
            })
            .catch(function (error) {
                var offline = error && error.message !== "not_verified";
                render("locked", offline
                    ? "We couldn't reach the membership service. Check your connection, or sign in again with the email you used at checkout."
                    : "Your session has expired or is not active. Sign in with the email address used at checkout to open this tool.");
            });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }
})();