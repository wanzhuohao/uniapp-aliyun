import { createPrefsStore } from '../common/prefsStore.js'
import { STORAGE_KEYS } from '../common/storageRegistry.js'

const store = createPrefsStore({ storageKey: STORAGE_KEYS.englishState })

export const getEnglishPrefs = store.getPrefs
export const setEnglishPrefs = store.setPrefs
