// Remove install button and banner
const appInstall = () => {
    installButton.hidden = true;
    installBanner.hidden = true;
    preDebug.append("App installed\r\n");
}

// Register serviceWorker on page loading
window.onload = () => {
    "use strict";

    if ("serviceWorker" in navigator && document.URL.split(":")[0] !== "file") {
        navigator.serviceWorker.register("./../sw.js");
    }

    if (window.matchMedia('(display-mode: standalone)').matches) {  
        appInstall();
    }
}

// Catch PWA install prompt and manage it 
window.addEventListener("beforeinstallprompt", e => {
    preDebug.append("Waiting for beforeinstallprompt...\r\n");
    const showDefaultPrompt = new URLSearchParams(location.search).has("showDefaultPrompt");
    preDebug.append(`> beforeinstallprompt fired with platforms: ${e.platforms.join(',')}\r\n`);
    
    
    if (showDefaultPrompt) {
      preDebug.append(
        "Default PWA mini info-bar on mobile should show up. Clear site settings if not.\r\n"
      );
      return;
    }

    installButton.hidden = false;
    installBanner.hidden = false;
    
    e.preventDefault();
    
    e.userChoice.then(result =>
        preDebug.append(`userChoice resolved with: ${JSON.stringify(result)}\r\n`)
    );
    
    installButton.onclick = () => {
        preDebug.append("Waiting for user choice...\r\n");
      e.prompt();
    };
});

// Check if app is installed 
window.addEventListener("appinstalled", e => {
    appInstall();
})

// Enable advanced live measurement mode
let nbClickSLM = 0;
liveMeasurementMode.addEventListener("click", e => {
    preDebug.append(`switch for live mode state change ${e.currentTarget.checked}\r\n`);

    nbClickSLM++;
    if (nbClickSLM > 42) {
        logoNavBar.style.transform = 'rotate(' + 180 + 'deg)';
    }
});
