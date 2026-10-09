/* Cache only the engine and resource pack. Player progress stays in its existing store. */
(function () {
  'use strict';
  window.installRestaurantStartupCache = async function (config) {
    const originalFetch = window.fetch;
    const fetchNetwork = (input, init) => originalFetch.call(window, input, init);
    const stats = {mode: 'http', hits: [], misses: [], stored: [], failures: []};
    window.__startupCacheStats = stats;
    let cache, manifest;
    try {
      if (!window.isSecureContext || !('caches' in window)) throw new Error('Cache unavailable');
      const response = await fetchNetwork('startup-assets.json', {cache: 'no-store'});
      if (!response.ok) throw new Error('Manifest unavailable');
      manifest = await response.json();
      cache = await caches.open('whale-startup-assets-v1');
    } catch (_) {
      return {restore() {}, whenStored: () => Promise.resolve(), invalidate: () => Promise.resolve()};
    }
    const assets = new Map();
    for (const name of [config.mainPack || config.executable + '.pck', config.executable + '.wasm']) {
      const item = manifest?.assets?.[name];
      if (!item || !/^[0-9a-f]{64}$/.test(item.sha256) || !Number.isSafeInteger(item.size) || item.size <= 0) continue;
      const url = new URL(name, location.href);
      if (url.origin !== location.origin) continue;
      const key = new URL(url);
      key.searchParams.set('asset', item.sha256);
      assets.set(url.href, {name, key: key.href, size: item.size});
    }
    if (assets.size !== 2) return {restore() {}, whenStored: () => Promise.resolve(), invalidate: () => Promise.resolve()};
    const writes = [];
    stats.mode = 'versioned';
    const CHUNK_SIZE = 8 * 1024 * 1024;
    const chunkKey = (item, index) => {
      const key = new URL(item.key);key.searchParams.set('chunk', String(index));return key.href;
    };
    async function removeVersion(item) {
      const current = new URL(item.key);
      for (const request of await cache.keys()) {
        const key = new URL(request.url);
        if (key.origin === current.origin && key.pathname === current.pathname && key.searchParams.get('asset') === current.searchParams.get('asset'))
          await cache.delete(request);
      }
    }
    async function readSaved(item) {
      const saved = await cache.match(item.key);
      if (!saved || !saved.ok) return null;
      if (saved.headers.get('X-Whale-Chunked') !== '1') return saved;
      const metadata = await saved.json();
      if (metadata.size !== item.size || metadata.count !== Math.ceil(item.size / CHUNK_SIZE)) throw new Error('Invalid cache metadata');
      const pieces = await Promise.all(Array.from({length: metadata.count}, (_, i) => cache.match(chunkKey(item, i))));
      if (pieces.some((piece, i) => !piece || Number(piece.headers.get('Content-Length')) !== Math.min(CHUNK_SIZE, item.size - i * CHUNK_SIZE)))
        throw new Error('Incomplete cache');
      let index = 0;
      return new Response(new ReadableStream({
        async pull(controller) {
          try {
            if (index === pieces.length) {controller.close();return;}
            controller.enqueue(new Uint8Array(await pieces[index++].arrayBuffer()));
          } catch (error) {controller.error(error);}
        }
      }), {headers: {'Content-Type': 'application/octet-stream', 'Content-Length': String(item.size)}});
    }
    async function storeResponse(item, response) {
      if (item.size <= 64 * 1024 * 1024) {
        await cache.put(item.key, response);
      } else {
        // Small entries avoid browser limits on a single 300 MB cache write.
        const reader = response.body.getReader();
        let buffer = new Uint8Array(CHUNK_SIZE), filled = 0, index = 0, total = 0;
        try {
          while (true) {
            const {done, value} = await reader.read();
            if (done) break;
            let offset = 0;
            while (offset < value.length) {
              const take = Math.min(buffer.length - filled, value.length - offset);
              buffer.set(value.subarray(offset, offset + take), filled);filled += take;offset += take;total += take;
              if (filled === buffer.length) {
                await cache.put(chunkKey(item, index++), new Response(buffer, {headers: {'Content-Length': String(filled)}}));
                buffer = new Uint8Array(CHUNK_SIZE);filled = 0;
              }
            }
          }
          if (total !== item.size) throw new Error('Incomplete network response');
          if (filled) await cache.put(chunkKey(item, index++), new Response(buffer.subarray(0, filled), {headers: {'Content-Length': String(filled)}}));
          // Publish the complete marker last; partial writes are never loaded.
          await cache.put(item.key, new Response(JSON.stringify({size: total, count: index}), {headers: {'X-Whale-Chunked': '1'}}));
        } catch (error) {
          await reader.cancel().catch(() => {});
          await removeVersion(item).catch(() => {});
          throw error;
        }
      }
      const current = new URL(item.key);
      for (const request of await cache.keys()) {
        const old = new URL(request.url);
        if (old.origin === current.origin && old.pathname === current.pathname && old.searchParams.get('asset') !== current.searchParams.get('asset'))
          await cache.delete(request);
      }
    }
    const wrappedFetch = async function (input, init) {
      const requestUrl = new URL(typeof input === 'string' || input instanceof URL ? input : input.url, location.href);
      const method = init?.method || (input instanceof Request ? input.method : 'GET');
      const item = method === 'GET' ? assets.get(requestUrl.href) : null;
      if (!item) return fetchNetwork(input, init);
      try {
        const saved = await readSaved(item);
        if (saved && saved.ok) {
          stats.hits.push(item.name);
          return saved;
        }
      } catch (_) { stats.failures.push('read:' + item.name);await removeVersion(item).catch(() => {}); }
      stats.misses.push(item.name);
      // Content-specific URLs prevent an old HTTP cache entry becoming the new version.
      const response = await fetchNetwork(item.key, init);
      if (response.ok) {
        const write = storeResponse(item, response.clone()).then(() => {
          stats.stored.push(item.name);
        }).catch(error => { stats.failures.push('write:' + item.name + ':' + error.name + ':' + error.message); });
        writes.push(write);
      }
      return response;
    };
    window.fetch = wrappedFetch;
    return {
      restore() { if (window.fetch === wrappedFetch) window.fetch = originalFetch; },
      whenStored: () => Promise.all(writes),
      invalidate: async () => { await Promise.all(writes);for (const item of assets.values()) await removeVersion(item); }
    };
  };
}());
