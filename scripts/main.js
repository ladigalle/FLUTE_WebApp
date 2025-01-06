/**
 * ----- BEGIN PWA Installation Process -----
 */

// Remove install button and banner
const appInstalled = () => {
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
        appInstalled();
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
    appInstalled();
})

/**
 * ----- END PWA Installation Process -----
 */

/**
 * ----- BEGIN BLE Process -----
 */
const fluteServicesUUID = [
    "4de7e0fc-01b0-4693-b3fb-e7c14a957bff", //  BLE ADV + FLUTE Measurement Service
    'device_information',                   //  Device Information Service (DIS 0x180A)
    "4eb81bd4-b229-4ca6-8a6f-583b78057dfa", //  Firmware Update OTA Service
    'battery_service',                      //  Baterry Service (BAS 0x180F)
];

var fluteDevice = null;
var fluteGATTServices = null;
var fluteGATTCharateritics = [];

var isDeviceConnected = false;


/**
 * "46561c3b-d66a-4038-bf64-19b9747370c8",
 * "eb7a6896-d9de-4a24-9945-93dff1793e43", //  FLUTE Device Mode Characteristic
 * "7c82e35a-d585-4424-94db-72140af95b4e", //  FLUTE Device Mode Range Characteristic
 * "ed34a4e6-ae68-4099-831f-4c3d432ab806", //  FLUTE Measured Value Characteristic
 * "c4400b8e-04bc-4076-9348-face6420560f", //  FLUTE Measured Value Unit Characteristic
 * "2eb59ac6-0922-43e5-9d8f-71cf7eb71b0a", //  DIS Customer Device Name Characteristic
 * "f03339c2-d2ac-4c2d-bd47-eabff617e20b", //  Firmware Update OTA Base Address Characteristic
 * "0899d7c8-9dec-4d99-9cea-da73d606db3b", //  Firmware Update OTA Confirmation Characteristic
 * "8966d085-57b8-4fa0-8b0b-0439b668c3c8", //  Firmware Update OTA Raw Data Characteristic
 *  */ 

//"00001809-0000-1000-8000-00805f9b34fb", {namePrefix: "HT"}

let connectBtn = document.getElementById("bntBLEConnect");
let disconnectBtn = document.getElementById("bntBLEDisconnect");

bntBLEConnect.addEventListener("click", e => {
    preDebug.append(`button for BLE connection clicked\r\n`);
    console.log(`> Requesting Bluetooth Device...`);

    navigator.bluetooth.requestDevice({
        filters: [
            {namePrefix: "F01B"},
        ],
        optionalServices: fluteServicesUUID
    })
    .then(device => {
        console.log(`Device named '${device.name}' selected`);
        console.log(device);
        fluteDevice = device;

        fluteDevice.addEventListener("gattserverdisconnected", onDisconnect);

        console.log(`> Connecting to '${device.name}'...`);
        return device.gatt.connect();
    })
    .then(server => {
        console.log(`Connected to '${server.device.name}'`);
        console.log(server);
        
        console.log(`> Getting Services from '${server.device.name}'...`);
        return server.getPrimaryServices();
    })
    .then(services => {
        console.log(`${services.length} Service(s) found on it`);
        console.log(services);
        fluteGATTServices = services;

        console.log(`> Getting Charateristic(s) from found service(s)...`);
        let queue = Promise.resolve();
        services.forEach(service => {
            queue = queue
            .then(_ => service.getCharacteristics())
            .then(characteristics => {
                console.log(`Service: ${service.device.name} - ${service.uuid}\n ${characteristics.length} Charateristic(s) found on selected Bluetooth Device`);
                console.log(characteristics);
                fluteGATTCharateritics.push(characteristics);
                if (service.uuid == '0000180a-0000-1000-8000-00805f9b34fb') {
                    readDISCharateristic();
                }
                
            });
            

            // characteristics.forEach(characteristic => {
            //     console.log(`Characteristic: ${characteristic.uuid} - ${getSupportedProperties(characteristic)}`);
            // })
        });

        isDeviceConnected = fluteDevice.gatt.connected;
        // return queue;
    })
    .catch(error => {
        console.log(`${error}`);
    });
    
    connectBtn.classList.add("d-none");
    connectBtn.hidden = true;
    disconnectBtn.classList.remove("d-none");
    disconnectBtn.hidden = false;
    
});

bntBLEDisconnect.addEventListener("click", e => {
    preDebug.append(`> button for BLE disconnection clicked\r\n`);
    console.log(`> Disconnecting from Bluetooth Device...\r\n`);
    
    onDisconnect();
});

function onDisconnect() {
    fluteDevice.gatt.disconnect();
    
    isDeviceConnected = false;

    console.log(`> Bluetooth Device disconnected\r\n`);

    fluteDevice = null;
    fluteGATTServices = null;
    fluteGATTCharateritics = [];

    flushDISUI();
    
    disconnectBtn.classList.add("d-none");
    disconnectBtn.hidden = true;
    connectBtn.classList.remove("d-none");
    connectBtn.hidden = false;
}

function BLEReadtoString(dataView) {
    let str = "";
    for (let i = 0; i < dataView.byteLength; i++) {
        str += String.fromCharCode(dataView.getUint8(i));
    }
    return str;
}

function readDISCharateristic() {
    if (isDeviceConnected) {
        let queueReadChar = Promise.resolve();
        fluteGATTCharateritics[2].forEach(characteristic => {
            queueReadChar = queueReadChar
            .then(_ => characteristic.readValue())
            .then(value => {
                console.log(`Device Informations Service ${characteristic.service.uuid} - Charateristic ${characteristic.uuid} - Value = ${BLEReadtoString(value)}`);
                updateDISUI(characteristic.uuid, value);
            });
        });
    }
}

function updateDISUI(cuuid, value) {
    if (cuuid == '00002a24-0000-1000-8000-00805f9b34fb') {
        productReference.value = BLEReadtoString(value);
    } else if (cuuid == '00002a26-0000-1000-8000-00805f9b34fb') {
        productFWRevision.value = BLEReadtoString(value);
    } else if (cuuid == '00002a27-0000-1000-8000-00805f9b34fb') {
        productHWRevision.value = BLEReadtoString(value);
    } else if (cuuid == '00002a29-0000-1000-8000-00805f9b34fb') {
        manufacturerName.value = BLEReadtoString(value);
    } else if (cuuid == '2eb59ac6-0922-43e5-9d8f-71cf7eb71b0a') {
        customerProductName.value = BLEReadtoString(value);
    }
}

function flushDISUI() {
    productReference.value = "";
    productFWRevision.value = "";
    productHWRevision.value = "";
    manufacturerName.value = "";
    customerProductName.value = "";
}

/**
 * ----- END BLE Process -----
 */

/**
 * ----- BEGIN UI Interaction Process -----
 */
// Enable advanced live measurement mode
var nbClickSLM = 0;
liveMeasurementMode.addEventListener("click", e => {
    preDebug.append(`switch for live mode state change ${e.currentTarget.checked}\r\n`);
    let simpleDiv = document.getElementById("liveMeasurementSimple");
    let advancedDiv = document.getElementById("liveMeasurementAdvanced");

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

var isLiveMeasurePaused = true;
var debugRefresh;
bntPauseResume.addEventListener("click", e => {
    let btnPR = document.getElementById("bntPauseResume");

    if (isLiveMeasurePaused == true) {
        preDebug.append(`play button for live measurment pressed\r\n`);
        isLiveMeasurePaused = false;
        btnPR.classList.remove("btn-success");
        btnPR.classList.add("btn-warning");
        bntPauseResume.innerHTML = '<i class="bi bi-pause-fill"></i>';
        debugRefresh = setInterval(updateChart, 250);
    } else {
        preDebug.append(`pause button for live measurment pressed\r\n`);
        isLiveMeasurePaused = true;
        btnPR.classList.remove("btn-warning");
        btnPR.classList.add("btn-success");
        bntPauseResume.innerHTML = '<i class="bi bi-play-fill"></i>';
        clearInterval(debugRefresh);
    }
    
});

// chart colors
const ctx = document.getElementById('measureLineChart');
var dataLabel = [];
var dataValue = [];

/* large line chart */
Chart.defaults.font.family = "'Roboto Slab', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', 'Noto Sans', 'Liberation Sans', Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'";
Chart.defaults.font.size = 16;

let mlc = new Chart(ctx, {
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

    let val = Math.random()*(3000 - 0) + 0;
    measureValue.innerHTML = ('0000' + val.toFixed(0)).slice(-4);
    dataValue.push(val);

    mlc.update();
}

/**
 * ----- END UI Interaction Process -----
 */