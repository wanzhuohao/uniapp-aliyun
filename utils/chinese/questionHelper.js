// Fisher-Yates shuffle
export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function sampleWithout(arr, n) {
  const shuffled = shuffle(arr)
  return shuffled.slice(0, Math.min(n, arr.length))
}

// 笔顺干扰项生成：打乱正确笔顺，确保与正确顺序不同
export function generateStrokeDistractors(correctStrokes, count = 3) {
  const key = correctStrokes.join(',')
  const distractors = []
  const seen = new Set([key])

  let attempts = 0
  while (distractors.length < count && attempts < 100) {
    const shuffled = shuffle(correctStrokes)
    const k = shuffled.join(',')
    if (!seen.has(k)) {
      seen.add(k)
      distractors.push([...shuffled])
    }
    attempts++
  }

  if (distractors.length < count) {
    for (let i = 0; i < correctStrokes.length - 1 && distractors.length < count; i++) {
      const swapped = [...correctStrokes]
      ;[swapped[i], swapped[i + 1]] = [swapped[i + 1], swapped[i]]
      const k = swapped.join(',')
      if (!seen.has(k)) {
        seen.add(k)
        distractors.push(swapped)
      }
    }
  }

  if (distractors.length < count) {
    const reversed = [...correctStrokes].reverse()
    const k = reversed.join(',')
    if (!seen.has(k)) {
      seen.add(k)
      distractors.push(reversed)
    }
  }

  return distractors
}
