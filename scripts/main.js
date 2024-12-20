/**
 * ----- BEGIN PWA Installation Process -----
 */

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

/**
 * ----- END PWA Installation Process -----
 */

/**
 * ----- BEGIN BLE Connection Process -----
 */
var fluteDevice;

const fluteServices = [
    "4de7e0fc-01b0-4693-b3fb-e7c14a957bff",
    "4eb81bd4-b229-4ca6-8a6f-583b78057dfa",
    "46561c3b-d66a-4038-bf64-19b9747370c8",
];

bntBLEConnect.addEventListener("click", e => {
    preDebug.append(`button for BLE connection clicked\r\n`);
    preDebug.append(`> Requesting Bluetooth Device...\r\n`);

    fluteDevice = navigator.bluetooth.requestDevice({
        filters: [
            {namePrefix: "FLUTE_"}
        ],
        optionalServices: fluteServices
    })
    .then(device => {
        fluteDevice = device;
        fluteDevice.addEventListener("gattserverdisconnected", onDisconnect);
        return device.gatt.connect();
    });
});


bntBLEDisconnect.addEventListener("click", e => {
    preDebug.append('> Disconnecting from Bluetooth Device...');
    myDevice.gatt.disconnect();
    // document.getElementById('connectButton').disabled = false;
    // props.setIsDisconnected(true);
    // props.setAllServices([]);
    // document.location.href = "/Web_Bluetooth_App_WBA";
});

function onDisconnect() {
    preDebug.append('> Bluetooth Device disconnected');
    // document.getElementById('connectButton').disabled = false;
    // props.setIsDisconnected(true);
    // props.setAllServices([]);
    // document.location.href = "/Web_Bluetooth_App_WBA/";
}


/**
 * ----- END BLE Connection Process -----
 */

/**
 * ----- BEGIN UI Interaction Process -----
 */
// Enable advanced live measurement mode
let nbClickSLM = 0;
liveMeasurementMode.addEventListener("click", e => {
    preDebug.append(`switch for live mode state change ${e.currentTarget.checked}\r\n`);
    var simpleDiv = document.getElementById("liveMeasurementSimple");
    var advancedDiv = document.getElementById("liveMeasurementAdvanced");

    if (e.currentTarget.checked == true) {
        simpleDiv.classList.add("d-none");
        simpleDiv.classList.remove("d-lg-flex");
        simpleDiv.hidden = true;
        advancedDiv.classList.remove("d-none");
        advancedDiv.classList.add("d-lg-flex");
        advancedDiv.hidden = false;
    } else {
        advancedDiv.classList.add("d-none");
        advancedDiv.classList.remove("d-lg-flex");
        advancedDiv.hidden = true;
        simpleDiv.classList.remove("d-none");
        simpleDiv.classList.add("d-lg-flex");
        simpleDiv.hidden = false;
    }

    nbClickSLM++;
    if (nbClickSLM > 42) {
        logoNavBar.style.transform = 'rotate(' + 180 + 'deg)';
    }
});

// chart colors
var colors = ['#007bff','#28a745','#333333','#c3e6cb','#dc3545','#6c757d'];
const ctx = document.getElementById('measureLineChart')

/* large line chart */
if (measureLineChart) {
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'],
            datasets: [{
                label: '# of Votes',
                data: [12, 19, 3, 5, 2, 3],
                borderWidth: 1
          }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
}

/**
 * ----- END UI Interaction Process -----
 */