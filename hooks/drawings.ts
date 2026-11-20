// The drawings made so far, of the band and of the backdrop. Each is made the first time
// it is asked for, and kept while it is among the latest asked for. A band is drawn for
// so many moments of a long session (each kind of work, heat, minute and ending) that
// keeping every one would hold more and more memory; one asked for again after it has
// gone is drawn again, in a few milliseconds.

export const KEPT_DRAWINGS = 24

const drawings = new Map<string, string>()

/** The drawing kept under `key`, else `draw()`'s, kept from now on. */
export function drawn(key: string, draw: () => string): string {
  const drawing = drawings.get(key) ?? draw()

  // The latest asked for goes last, so the one asked for longest ago is the first.
  drawings.delete(key)
  drawings.set(key, drawing)

  for (const old of drawings.keys()) {
    if (drawings.size <= KEPT_DRAWINGS) {
      break
    }
    drawings.delete(old)
  }

  return drawing
}

/** How many drawings are kept now: never more than KEPT_DRAWINGS. */
export const keptDrawings = (): number => drawings.size
