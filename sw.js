let cacheName = "flute-web-app"

let assetsFileCache = [
    "",
    "index.html",
    "favicon.ico",
    "styles/main.css",
    "styles/bs-css-min_5.3.3.css",
    "scripts/main.js",
    "scripts/bs-js-bundle-min_5.3.3.js",
]

self.addEventListener("install", function(e) {
    e.waitUntil(
        caches.open(cacheName).then(function(cache) {
            return cache.addAll(assetsFileCache)
        })
    )
})

self.addEventListener("fetch", function(e) {
    e.respondWith(
        caches.match(e.request).then(function(reponse) {
            return reponse || fetch(e.request)
        })
    )
})