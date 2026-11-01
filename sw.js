const CACHE_NAME = 'flashcards-v1';
// 这里列出需要缓存的资源（你的图片文件名）
const urlsToCache = [
  './index.html',
  './manifest.json',
  // 把你的图片文件名都加进来，例如：
  'https://cdn.jsdelivr.net/gh/JinYang-HUAT/Vocabulary-Flashcards@main/admiral.jpg',
  'https://cdn.jsdelivr.net/gh/JinYang-HUAT/Vocabulary-Flashcards@main/adulterate.jpg',
  // ... 建议把全部图片链接都加进来
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});