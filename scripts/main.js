window.onload = () => {
    "use strict";

    if ("serviceWorker" in navigator && document.URL.split(":")[0] !== "file") {
        navigator.serviceWorker.register("./../sw.js");
    }
}

window.addEventListener("beforeinstallprompt", e => {
    pre.append(`> beforeinstallprompt fired with platforms: ${e.platforms.join(',')}\r\n`);
    const showDefaultPrompt = new URLSearchParams(location.search).has(
      "showDefaultPrompt"
    );
    if (showDefaultPrompt) {
      pre.append(
        "Default PWA mini info-bar on mobile should show up. Clear site settings if not.\r\n"
      );
      return;
    }
    promptButton.hidden = false;
    e.preventDefault();
    e.userChoice.then(result =>
      pre.append(`userChoice resolved with: ${JSON.stringify(result)}\r\n`)
    );
    promptButton.onclick = () => {
      pre.append(
        "Waiting for user choice...\r\n"
      );
      e.prompt();
    };
  });