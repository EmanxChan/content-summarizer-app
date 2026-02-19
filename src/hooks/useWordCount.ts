'use client'

import { useState, useEffect } from 'react'

export function useWordCount(defaultValue = 300) {
  const [words, setWordsRaw] = useState(defaultValue)

  useEffect(() => {
    try {
      const v = localStorage.getItem('pref_word_count')
      if (v) setWordsRaw(Number(v))
    } catch { /* ignore */ }
  }, [])

  function setWords(n: number) {
    setWordsRaw(n)
    try { localStorage.setItem('pref_word_count', String(n)) } catch { /* ignore */ }
  }

  return [words, setWords] as const
}
