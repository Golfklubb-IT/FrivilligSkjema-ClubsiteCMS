self.addEventListener('install', (e) => {
    console.log('Ski GK PWA Service Worker Installed');
});

self.addEventListener('fetch', (e) => {
    // Offline støtte kan bygges inn her senere, justerer kun for fetch atm
});