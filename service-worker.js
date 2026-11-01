/* 词汇闪卡 Service Worker —— 离线可用 + 图片缓存 */
const VERSION = "v1.0.1";
const APP_CACHE = `flashcards-app-${VERSION}`;
const IMG_CACHE = `flashcards-img-${VERSION}`;
const IMG_HOST = "cdn.jsdelivr.net";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(APP_CACHE)
      .then(c => c.addAll(APP_SHELL).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys
        .filter(k => k !== APP_CACHE && k !== IMG_CACHE)
        .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  /* 图片：缓存优先，后台更新（stale-while-revalidate） */
  if (url.hostname === IMG_HOST || /\.(png|jpe?g|gif|webp|svg|bmp|avif|ico)$/i.test(url.pathname)){
    event.respondWith(
      caches.open(IMG_CACHE).then(async cache => {
        const cached = await cache.match(req);
        const network = fetch(req).then(res => {
          if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
          return res;
        }).catch(() => null);
        return cached || network || new Response("", {status: 504});
      })
    );
    return;
  }

  /* 页面/静态资源：网络优先，失败回退缓存 */
  if (url.origin === self.location.origin){
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(APP_CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        if (req.mode === "navigate") return caches.match("./index.html");
        return new Response("", {status: 504});
      })
    );
  }
});