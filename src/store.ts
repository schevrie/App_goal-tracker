import { useCallback, useEffect, useState } from 'react'
import { emptyData, type Data } from './types'

// The whole dataset is small (a few hundred KB after years), so it is stored
// as one JSON document in IndexedDB and rewritten on every change.
const DB = 'focus'
const STORE = 'kv'
const KEY = 'data'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function load(): Promise<Data> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE).objectStore(STORE).get(KEY)
    req.onsuccess = () => resolve(req.result ? { ...emptyData(), ...req.result } : emptyData())
    req.onerror = () => reject(req.error)
  })
}

async function save(data: Data) {
  const db = await open()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(data, KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export type Update = (fn: (d: Data) => Data) => void

export function useData(): [Data | null, Update] {
  const [data, setData] = useState<Data | null>(null)

  useEffect(() => {
    load().then(setData)
    // Ask the browser not to evict our data under storage pressure.
    navigator.storage?.persist?.()
  }, [])

  const update = useCallback<Update>((fn) => {
    setData((prev) => {
      if (!prev) return prev
      const next = fn(prev)
      save(next)
      return next
    })
  }, [])

  return [data, update]
}
