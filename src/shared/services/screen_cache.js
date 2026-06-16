import { isNetworkError } from './offline_helpers'
import { getMetadata, setMetadata } from './offline_db'

const SCREEN_CACHE_PREFIX = 'screen_snapshot:'

export async function readWithScreenCache(cacheKey, onlineFetch) {
  const storageKey = buildScreenCacheKey(cacheKey)
  try {
    const data = await onlineFetch()
    await setMetadata(storageKey, {
      cached_at: new Date().toISOString(),
      data,
    })
    return data
  } catch (error) {
    if (!isNetworkError(error)) throw error
    const snapshot = await getMetadata(storageKey)
    if (!snapshot?.data) throw error
    return attachOfflineMeta(snapshot.data, snapshot.cached_at)
  }
}

export async function saveScreenSnapshot(cacheKey, data) {
  await setMetadata(buildScreenCacheKey(cacheKey), {
    cached_at: new Date().toISOString(),
    data,
  })
}

export async function readScreenSnapshot(cacheKey) {
  const snapshot = await getMetadata(buildScreenCacheKey(cacheKey))
  return snapshot?.data || null
}

export function extractScreenSnapshotMeta(...payloads) {
  const match = payloads.find((payload) => payload?.__offline)
  if (!match) return null
  return {
    cachedAt: match.__cached_at || '',
  }
}

export function formatSnapshotDate(value) {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toLocaleString()
}

function buildScreenCacheKey(cacheKey) {
  return `${SCREEN_CACHE_PREFIX}${cacheKey}`
}

function attachOfflineMeta(data, cachedAt) {
  if (!data || typeof data !== 'object') {
    return {
      data,
      __offline: true,
      __cached_at: cachedAt || '',
    }
  }
  return {
    ...data,
    __offline: true,
    __cached_at: cachedAt || '',
  }
}
