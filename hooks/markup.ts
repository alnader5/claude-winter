// What the band's drawing and the backdrop's share as markup.

/**
 * A style as text in the markup, escaped: it then reads the same parsed as XML, as
 * HTML, or through the desktop's scrub, which takes a bare "<length>" in an @property
 * rule for a tag, drops it, and the rule with it.
 */
export function textOf(css: string): string {
  return css.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
