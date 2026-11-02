const CACHE_NAME = 'vocab-flashcards-v1';
const IMAGES = []; // 由页面通过 postMessage 传入

// 安装：缓存 HTML 本身
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(['./', './index.html']).catch(() => {})
    )
  );
  self.skipWaiting();
});

// 激活：清理旧缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 接收页面传来的图片清单，逐张缓存
self.addEventListener('message', event => {
  if (!event.data || event.data.type !== 'CACHE_IMAGES') return;
  const urls = event.data.urls || [];
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      let count = 0;
      for (const url of urls) {
        try {
          const hit = await cache.match(url);
          if (hit) { count++; continue; }
          const resp = await fetch(url, { mode: 'cors' });
          if (resp.ok) {
            await cache.put(url, resp.clone());
            count++;
          }
        } catch (e) {
          console.warn('缓存失败：', url, e);
        }
      }
      // 通知所有页面
      const clients = await self.clients.matchAll();
      clients.forEach(c => c.postMessage({ type: 'CACHE_DONE', count }));
    })
  );
});

// 拦截请求：缓存优先，网络兜底
self.addEventListener('fetch', event => {
  const req = event.request;
  // 只处理 GET
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(resp => {
        // 成功响应可顺手缓存（同源或图片）
        if (resp && resp.status === 200 && (req.url.includes('/images/') || req.url.endsWith('.html') || req.url.endsWith('/'))) {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        }
        return resp;
      }).catch(() => {
        // 离线且无缓存：图片返回占位，其它返回缓存中的 HTML
        if (req.url.includes('/images/')) {
          return new Response(
            '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="120"><rect width="200" height="120" fill="#f1f5f9"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#94a3b8" font-size="14">Offline</text></svg>',
            { headers: { 'Content-Type': 'image/svg+xml' } }
          );
        }
        return caches.match('./index.html');
      });
    })
  );
});