/**
 * Software page — a tiny tokenizer for the decorative code blocks (build time only).
 * A line of our own code → tokens with a kind (colour) and a start column; the columns are what lets the WebGL
 * glyphs land exactly on the DOM text (motion/code-glyphs.ts).
 * `{{dp|pd}}` marks characters that are wrong on purpose and get swapped: "dp" flies out, "pd" flies in.
 * The code is ours, short and themed on WaysZ: no copied code, no product names, no URLs.
 */
export type TokKind = 'ws' | 'com' | 'str' | 'key' | 'num' | 'fn' | 'id' | 'pun';
export interface Tok { kind: TokKind; text: string; col: number; swap?: string }

const KEYWORDS = new Set(['const', 'let', 'if', 'else', 'return', 'true', 'false', 'null', 'new', 'await', 'for', 'of']);
const PATTERN = /(\/\/.*$)|\{\{([^|}]+)\|([^}]+)\}\}|("[^"]*")|(\s+)|(\d+)|([A-Za-z_]\w*)|(.)/g;

export function tokenize(line: string): Tok[] {
  const out: Tok[] = [];
  let col = 0;
  for (const m of line.matchAll(PATTERN)) {
    const [, com, bad, good, str, ws, num, word, other] = m;
    let tok: Tok;
    if (com) tok = { kind: 'com', text: com, col };
    else if (bad) tok = { kind: 'id', text: bad, swap: good, col };
    else if (str) tok = { kind: 'str', text: str, col };
    else if (ws) tok = { kind: 'ws', text: ws, col };
    else if (num) tok = { kind: 'num', text: num, col };
    else if (word) tok = { kind: KEYWORDS.has(word) ? 'key' : line[m.index! + m[0].length] === '(' ? 'fn' : 'id', text: word, col };
    else tok = { kind: 'pun', text: other!, col };
    col += tok.text.length;
    out.push(tok);
  }
  // a word cut in pieces by a swap keeps one colour: every piece takes the kind of the last one
  for (let i = out.length - 2; i >= 0; i--) {
    const a = out[i], b = out[i + 1];
    if ((a.swap || b.swap) && (a.kind === 'id' || a.kind === 'fn') && (b.kind === 'id' || b.kind === 'fn')) a.kind = b.kind;
  }
  return out;
}
