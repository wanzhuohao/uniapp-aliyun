import { createPrefsStore } from '../common/prefsStore.js'

const store = createPrefsStore({ storageKey: 'english_state' })

export const getEnglishPrefs = store.getPrefs
export const setEnglishPrefs = store.setPrefs
