window.onload = () => {
    // Register serviceWorker on page loading
    "use strict";

    if ("serviceWorker" in navigator && document.URL.split(":")[0] !== "file") {
        navigator.serviceWorker.register("./../sw.js");
    }

    if (window.matchMedia('(display-mode: standalone)').matches) {  
        appInstalled();
    }
}


/**
 * ----- BEGIN PWA Installation Process -----
 */

// Remove install button and banner
const appInstalled = () => {
    installButton.hidden = true;
    installBanner.hidden = true;
    preDebug.append("App installed\r\n");
}

// Catch PWA install prompt and manage it 
window.addEventListener("beforeinstallprompt", e => {
    preDebug.append("Waiting for beforeinstallprompt...\r\n");
    const showDefaultPrompt = new URLSearchParams(location.search).has("showDefaultPrompt");
    preDebug.append(`> beforeinstallprompt fired with platforms: ${e.platforms.join(',')}\r\n`);
    
    if (showDefaultPrompt) {
      preDebug.append("Default PWA mini info-bar on mobile should show up. Clear site settings if not.\r\n");
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
    'battery_service',                      //  BAttery Service (BAS 0x180F)
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

//  "00001809-0000-1000-8000-00805f9b34fb", {namePrefix: "HT"}  //  Used for debug with demo example

let btnBC = document.getElementById("btnBLEConnect");
let btnBD = document.getElementById("btnBLEDisconnect");

btnBLEConnect.addEventListener("click", e => {
    preDebug.append(`button for BLE connection clicked\r\n`);
    console.log(`> Requesting Bluetooth Device...`);

    navigator.bluetooth.requestDevice({
        filters: [{namePrefix: "F01B"}],
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
                
                fluteGATTCharateritics.push(service.uuid);
                fluteGATTCharateritics.push(characteristics);
                
                if (service.uuid == '0000180a-0000-1000-8000-00805f9b34fb') {
                    readDISCharateristics();
                } else if (service.uuid == '0000180f-0000-1000-8000-00805f9b34fb') {
                    readNotifyBASCharateristics();
                }
            });
        });
        
        isDeviceConnected = fluteDevice.gatt.connected;
    })
    .then(n => {
        updateUIDevice();
    })
    .catch(error => {
        console.error(`${error}`);
    });
});

btnBLEDisconnect.addEventListener("click", e => {
    preDebug.append(`button for BLE disconnection clicked\r\n`);
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

    flushUIDISCharacteristics();
    updateUIDevice();
}

//  Raw BLE values <-> Typed values converters functions
function BLEReadtoString(dataView) {
    let str = "";
    for (let i = 0; i < dataView.byteLength; i++) {
        str += String.fromCharCode(dataView.getUint8(i));
    }
    return str;
}

//  Functions for DIS (Device Informations Service) Charateristics
function readDISCharateristics() {
    if (isDeviceConnected) {
        let queueReadChar = Promise.resolve();
        fluteGATTCharateritics[fluteGATTCharateritics.indexOf('0000180a-0000-1000-8000-00805f9b34fb')+1].forEach(characteristic => {
            queueReadChar = queueReadChar
            .then(_ => characteristic.readValue())
            .then(value => {
                console.log(`Device Informations Service ${characteristic.service.uuid} - Charateristic ${characteristic.uuid} - Value = ${BLEReadtoString(value)}`);
                updateUIDISCharacteristics(characteristic.uuid, value);
            });
        });
    }
}

function updateUIDISCharacteristics(cuuid, value) {
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

function flushUIDISCharacteristics() {
    productReference.value = "";
    productFWRevision.value = "";
    productHWRevision.value = "";
    manufacturerName.value = "";
    customerProductName.value = "";
}

//  Functions for BAS (BAttery Service) Charateristics
function readNotifyBASCharateristics() {
    return null;
}

/**
 * ----- END BLE Process -----
 */


/**
 * ----- BEGIN Indexed DB Process -----
 */
const sessionsRecordDBname = "flute-session-db";
const requestDB = window.indexedDB.open(sessionsRecordDBname, 1);
var sessionsRecordDB;
var isDBaccessOK = false;

requestDB.onerror = (e) => {
    console.error(`It seems that your web-browser is not compatible with the in-browser web storage for recorded sessions. Please update your browser to use this feature\r\nError code: ${e.target.error?.message}`);
    pSessionNothing.innerHTML = `It seems that your web-browser is not compatible with the in-browser web storage for recorded sessions. Please update your browser to use this feature\r\nError code: ${e.target.error?.message}`;
};
//  Connection to Indexed DB and check for existing recorded sessions
requestDB.onsuccess = (e) => {
    isDBaccessOK = true;
    sessionsRecordDB = sessionsRecordDB = e.target.result;
    var sOS = sessionsRecordDB.transaction("sessions", "readwrite").objectStore("sessions");

    // Get the last recorded session key and update session list
    sOS.getAllKeys().onsuccess = (e) => {
        nbSessions =  e.target.result[e.target.result.length -1];
        updateSessionsList();
    };
};
//  Create an Indexed DB and set the structure to store sessions inside
requestDB.onupgradeneeded = (e) => {
    sessionsRecordDB = e.target.result;

    const objectStore = sessionsRecordDB.createObjectStore("sessions", {autoIncrement: true});
    
    objectStore.createIndex("name", "name", {unique: false});
    objectStore.createIndex("unit", "unit", {unique: false});
    objectStore.createIndex("data", "data", {unique: false});

    objectStore.transaction.oncomplete = (e) => {
        isDBaccessOK = true;
    }
}
/**
 * ----- END Indexed DB Process -----
 */


/**
 * ----- BEGIN UI Interaction Process -----
 */
const byteSize = str => new Blob([str]).size;

let divDI = document.getElementById("divNoDeviceInfo");
let divDB = document.getElementById("divDeviceButtons");
let btnMC = document.getElementById("btnModifyCancel");
let btnMA = document.getElementById("btnModifyApply");
let divMS = document.getElementById("liveMeasurementSimple");
let divMA = document.getElementById("liveMeasurementAdvanced");
let btnPR = document.getElementById("btnPauseResume");
let btnRS = document.getElementById("btnRecordStop");
let divSN = document.getElementById("sessionsNothing");
let divST = document.getElementById("sessionsTable");

function updateUIDevice(){
    if (isDeviceConnected) {
        btnBC.hidden = true;
        btnBC.classList.add("d-none");
        divDI.hidden = true;
        divDI.classList.add("d-none");
        btnBD.hidden = false;
        btnBD.classList.remove("d-none");
        divDB.hidden = false;
        divDB.classList.remove("d-none");
    } else {
        btnBD.hidden = true;
        btnBD.classList.add("d-none");
        divDB.hidden = true;
        divDB.classList.add("d-none");
        btnBC.hidden = false;
        btnBC.classList.remove("d-none");
        divDI.hidden = false;
        divDI.classList.remove("d-none");
    }
}

// Enable advanced live measurement mode
var nbClickSLM = 0;
liveMeasurementMode.addEventListener("click", e => {
    preDebug.append(`switch for live mode state change ${e.currentTarget.checked}\r\n`);

    if (e.currentTarget.checked == true) {
        divMS.classList.add("d-none");
        divMS.classList.remove("d-lg-flex");
        divMS.hidden = true;
        divMA.classList.remove("d-none");
        divMA.classList.add("d-lg-flex");
        divMA.hidden = false;
    } else {
        divMA.classList.add("d-none");
        divMA.classList.remove("d-lg-flex");
        divMA.hidden = true;
        divMS.classList.remove("d-none");
        divMS.classList.add("d-lg-flex");
        divMS.hidden = false;
    }

    nbClickSLM++;
    if (nbClickSLM > 42) {
        logoNavBar.style.transform = `rotate(${180}deg)`;
    }
});

var isLiveMeasurePaused = true;
var debugRefresh;
btnPauseResume.addEventListener("click", e => {
    if (isLiveMeasurePaused == true) {
        preDebug.append(`play button for live measurment pressed\r\n`);
        isLiveMeasurePaused = false;
        btnPR.classList.remove("btn-success");
        btnPR.classList.add("btn-warning");
        btnPauseResume.innerHTML = '<i class="bi bi-pause-fill"></i>';
        btnRecordStop.disabled = false;
        debugRefresh = setInterval(updateMeasureValue, 250);
    } else {
        preDebug.append(`pause button for live measurment pressed\r\n`);
        isLiveMeasurePaused = true;
        btnPR.classList.remove("btn-warning");
        btnPR.classList.add("btn-success");
        btnPauseResume.innerHTML = '<i class="bi bi-play-fill"></i>';
        btnRecordStop.disabled = true;
        clearInterval(debugRefresh);
    }
});

var isLiveMeasureRecorded = false;
var sessionsRecordList = [];
var nbSessions = 0;

function formatNumber (value) {
    return ('00' + value.toFixed(0)).slice(-2);
}

function updateSessionsList() {
    if (nbSessions > 0) {
        sessionsNothing.hidden = true;
        divSN.classList.add("d-none");
        sessionsTable.hidden = false;
        divST.classList.remove("d-none");
    }

    if (isDBaccessOK) {
        let sOS = sessionsRecordDB.transaction("sessions", "readwrite").objectStore("sessions");
        sessionsRecordList = [];
        
        sOS.openCursor().onsuccess = (e) => {
            let list = "";
            let cursor =  e.target.result;
            
            if (cursor) {
                sessionsRecordList.push([cursor.key, cursor.value]);

                sessionsRecordList.forEach(session => {
                    list += `<tr><td>${session[0]}</td><td>${session[1].name}</td><td><button type="button" id="btnSessionDownload" class="btn btn-sm btn-outline-info" onclick="exportSession2CSV(this)" value=${sessionsRecordList.indexOf(session)}><i class="bi bi-download"></i></button>&nbsp;<button type="button" id="btnSessionDelete" class="btn btn-sm btn-outline-danger" onclick="deleteSession(this)" value=${session[0]}><i class="bi bi-trash-fill"></i></button></td></tr>`;
                })
                
                sessionsList.innerHTML = list;
                cursor.continue();
            }
        };
    }    
}

function deleteSession(b) {
    if (b.id = "btnSessionDelete"){
        if (isDBaccessOK) {
            let sOS = sessionsRecordDB.transaction("sessions", "readwrite").objectStore("sessions");
            sOS.delete(parseInt(b.value)).onsuccess = (d) => {
                sOS.count().onsuccess = (e) => {
                    if (e.target.result > 0) {
                        updateSessionsList();
                    } else {
                        sessionsTable.hidden = true;
                        divST.classList.add("d-none");
                        sessionsNothing.hidden = false;
                        divSN.classList.remove("d-none");
                    }
                };
            };
        }
    }
}

function exportSession2CSV(e) {
    let csvContent = "data:text/csv;charset=utf-8,";

    if (e.id = "btnSessionDownload"){
        let session = sessionsRecordList[e.value];
        let filename = session[1].name + ".csv";
        csvContent += `Time(ms),Value(${session[1].unit})\r\n`;
        let data = session[1].data;

        data.forEach(row => {
            csvContent += row.join(",") + "\r\n";
        })

        let encodedURI = encodeURI(csvContent);
        let tmpLink = document.createElement("a");
        tmpLink.setAttribute("href", encodedURI);
        tmpLink.setAttribute("download", filename);
        document.body.appendChild(tmpLink);
        tmpLink.click();
        document.body.removeChild(tmpLink);
    }
}


btnRecordStop.addEventListener("click", e => {
    if (isLiveMeasureRecorded == true) {
        preDebug.append(`play stop for live measurment pressed\r\n`);
        isLiveMeasureRecorded = false;
        btnRS.classList.remove("btn-outline-danger");
        btnRS.classList.add("btn-danger");
        btnRecordStop.innerHTML = '<i class="bi bi-record-fill"></i>';

        if (isDBaccessOK) {
            let sOS = sessionsRecordDB.transaction("sessions", "readwrite").objectStore("sessions");
            let timestamp = new Date();
            let sessionName = `${timestamp.getFullYear()}-${formatNumber(timestamp.getMonth()+1)}-${formatNumber(timestamp.getDate())}_${formatNumber(timestamp.getHours())}-${formatNumber(timestamp.getMinutes())}-${formatNumber(timestamp.getSeconds())}_getMode`;

            sOS.add({name: sessionName, unit: 'getModeUnit', data: recordedData});
            recordedData = [];

            // Get the last recoded session key and update session list
            sOS.getAllKeys().onsuccess = (e) => {
                nbSessions =  e.target.result[e.target.result.length -1];
                updateSessionsList();
            };
        }
    } else {
        preDebug.append(`play record for live measurment pressed\r\n`);
        isLiveMeasureRecorded = true;
        btnRS.classList.remove("btn-danger");
        btnRS.classList.add("btn-outline-danger");
        btnRecordStop.innerHTML = '<i class="bi bi-stop-fill"></i>';
    }
});

// chart colors
const ctx = document.getElementById('measureLineChart');
var dataLabel = [];
var dataValue = [];
var recordedData = [];  //  Structure: {time, value}

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
let iRecord = 0;
function updateMeasureValue () {
    if (dataValue.length > 30) {
        dataValue.shift();
    } else {
        dataLabel.push(`${iLabel}`);
    }

    iLabel++;
    
    let val = Math.random()*(3000 - 0) + 0;
    measureValue.innerHTML = ('0000' + val.toFixed(0)).slice(-4);
    dataValue.push(val);
    
    if (isLiveMeasurePaused == false && isLiveMeasureRecorded == true) {
        recordedData.push([iRecord, val]);
        iRecord += 250;
    }

    mlc.update();
}

/**
 * ----- END UI Interaction Process -----
 */