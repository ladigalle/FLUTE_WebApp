let cacheName = "flute-web-app"

let assetsFileCache = [
    "",
    "index.html",
    "favicon.ico",
    "images/icons/icon-96x96.webp",
    "images/icons/icon-144x144.webp",
    "images/icons/icon-192x192.webp",
    "images/icons/icon-512x512.webp",
    "images/logo-flute-tools.png",
    "styles/main.css",
    "styles/bs-css-min_f_5.3.3.css",
    "styles/bs-icons-min_1.11.3.css",
    "styles/fonts/bootstrap-icons.woff",
    "styles/fonts/bootstrap-icons.woff2",
    "scripts/main.js",
    "scripts/bs-js-bundle-min_5.3.3.js",
    "scripts/chartjs-min_4.4.7.js",
]

self.addEventListener("install", function(e) {
    e.waitUntil(
        caches.open(cacheName).then(async function(cache) {
            return cache.addAll(assetsFileCache)
        })
    )
})

self.addEventListener("fetch", function(e) {
    e.respondWith(
        caches.match(e.request).then(async function(reponse) {
            return reponse || fetch(e.request)
        })
    )
})