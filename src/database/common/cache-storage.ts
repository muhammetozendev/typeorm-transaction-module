import { MemoryCache, caching } from 'cache-manager';

export class CacheStorage {
  private static readonly DEFAULT_TTL = 100_000;
  private static readonly DEFAULT_MAX_ALLOWED_VALUES = 1000;

  private static cache: Promise<MemoryCache> = caching('memory', {
    max: CacheStorage.DEFAULT_MAX_ALLOWED_VALUES,
    ttl: CacheStorage.DEFAULT_TTL,
  });

  static async get(key: string) {
    const cache = await CacheStorage.cache;
    const wrapper = await cache.get<{
      value: any;
      once: boolean;
    }>(key);
    if (wrapper?.once === true) {
      await cache.del(key);
    }
    return wrapper?.value;
  }

  static async set(
    key: string,
    value: any,
    options: {
      ttl?: number;
      once?: boolean;
    }
  ) {
    const cache = await CacheStorage.cache;
    const wrapper = {
      value,
      once: options.once,
    };
    return await cache.set(
      key,
      wrapper,
      options.ttl ?? CacheStorage.DEFAULT_TTL
    );
  }
}
