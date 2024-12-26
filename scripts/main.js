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

let isLiveMeasurePaused = false;
let debugRefresh = setInterval(updateChart, 250);
bntPauseResume.addEventListener("click", e => {
    var btnPR = document.getElementById("bntPauseResume");

    if (isLiveMeasurePaused == true) {
        preDebug.append(`pause button for live \r\n`);
        isLiveMeasurePaused = false;
        bntPauseResume.innerHTML = '<i class="bi bi-play-fill"></i>';
        btnPR.classList.remove("btn-outline-warning");
        btnPR.classList.add("btn-success");
        debugRefresh = setInterval(updateChart, 250);
    } else {
        preDebug.append(`play button for live \r\n`);
        isLiveMeasurePaused = true;
        bntPauseResume.innerHTML = '<i class="bi bi-pause-fill"></i>';
        btnPR.classList.remove("btn-success");
        btnPR.classList.add("btn-outline-warning");
        clearInterval(debugRefresh);
    }
    
});

// chart colors
const ctx = document.getElementById('measureLineChart')
let mlc;
var dataLabel = []; //'Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'
var dataValue = []; //12, 19, 3, 5, 2, 3

/* large line chart */
Chart.defaults.font.family = "'Roboto Slab', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', 'Noto Sans', 'Liberation Sans', Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'";
Chart.defaults.font.size = 16;

mlc = new Chart(ctx, {
type: 'line',
data: {
    labels: dataLabel,
    datasets: [{
        label: 'Measures',
        data: dataValue,
        borderColor: '#FAB500',
        backgroundColor: '#FAB500',
        borderWidth: 5,
    }]
},
options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            display: false,
        },
    },
    scales: {
        x: {
            display: false,
        },
        y: {
            beginAtZero: false,
            title: {
                display: true,
                text: 'milliVolt (mV)',
                align: 'center', 
            },
        }
    }
}
});

let iLabel = 0;
function updateChart () {
    if (dataValue.length > 30) {
        dataValue.shift();
    } else {
        dataLabel.push(`${iLabel}`);
        iLabel++;
    }
    // mlc.data.labels.push(`${iLabel}`);

    let val = Math.random()*(3000 - 0) + 0;
    measureValue.innerHTML = ('0000' + val.toFixed(0)).slice(-4);
    dataValue.push(val);
    // mlc.data.datasets.forEach((dataset) => {
    //     dataset.data.push(val);
    // });
    mlc.update();
}

/**
 * ----- END UI Interaction Process -----
 */