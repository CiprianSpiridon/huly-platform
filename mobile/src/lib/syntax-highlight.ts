/**
 * Lightweight syntax highlighter for Huly mobile code blocks.
 *
 * Implements a highlight.js-style token pipeline without the full library,
 * keeping the bundle well under 200KB. Supports a curated language subset:
 * TypeScript/JavaScript, Python, Go, JSON, and Bash.
 *
 * The tokenizer walks source text once, emitting {text, kind} spans.
 * Unknown languages fall through to a single "plain" span so callers render
 * monospace text without extra color passes.
 */

export type TokenKind =
  | 'plain'
  | 'keyword'
  | 'string'
  | 'number'
  | 'comment'
  | 'builtin'
  | 'punctuation'
  | 'operator'
  | 'function'
  | 'type'
  | 'attr'

export interface HighlightToken {
  text: string
  kind: TokenKind
}

export type SupportedLanguage =
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'go'
  | 'json'
  | 'bash'

const LANG_ALIASES: Record<string, SupportedLanguage> = {
  ts: 'typescript',
  tsx: 'typescript',
  typescript: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  javascript: 'javascript',
  py: 'python',
  python: 'python',
  go: 'go',
  golang: 'go',
  json: 'json',
  sh: 'bash',
  shell: 'bash',
  bash: 'bash',
  zsh: 'bash',
}

export function normalizeLanguage(lang: string | undefined | null): SupportedLanguage | null {
  if (lang == null) return null
  const key = lang.toLowerCase().trim()
  return LANG_ALIASES[key] ?? null
}

// Soft safety cap — keep tokenizer bounded even for pathological inputs.
const MAX_CHARS = 50_000
// Practical cap on how many lines we colorize before degrading to plain.
export const MAX_HIGHLIGHT_LINES = 200

interface LanguageRules {
  keywords: ReadonlySet<string>
  builtins?: ReadonlySet<string>
  lineComment?: string
  blockComment?: [string, string]
  strings: ReadonlyArray<{ open: string, close: string, escape?: boolean }>
  numberRegex: RegExp
  identifierRegex: RegExp
  operatorChars: string
  punctuationChars: string
}

const TS_KEYWORDS = new Set([
  'as', 'async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue',
  'debugger', 'default', 'delete', 'do', 'else', 'enum', 'export', 'extends',
  'false', 'finally', 'for', 'from', 'function', 'if', 'implements', 'import',
  'in', 'instanceof', 'interface', 'let', 'new', 'null', 'of', 'private',
  'protected', 'public', 'readonly', 'return', 'static', 'super', 'switch',
  'this', 'throw', 'true', 'try', 'type', 'typeof', 'undefined', 'var', 'void',
  'while', 'with', 'yield', 'abstract', 'declare', 'keyof', 'namespace', 'satisfies',
])
const TS_BUILTINS = new Set([
  'console', 'Promise', 'Array', 'Object', 'String', 'Number', 'Boolean',
  'Map', 'Set', 'JSON', 'Math', 'Date', 'Error', 'RegExp', 'Symbol',
])

const PY_KEYWORDS = new Set([
  'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def',
  'del', 'elif', 'else', 'except', 'False', 'finally', 'for', 'from', 'global',
  'if', 'import', 'in', 'is', 'lambda', 'None', 'nonlocal', 'not', 'or', 'pass',
  'raise', 'return', 'True', 'try', 'while', 'with', 'yield', 'match', 'case',
])
const PY_BUILTINS = new Set([
  'print', 'len', 'range', 'str', 'int', 'float', 'bool', 'list', 'dict',
  'set', 'tuple', 'open', 'isinstance', 'type', 'enumerate', 'zip', 'map',
  'filter', 'sorted', 'sum', 'min', 'max', 'abs', 'round', 'self', 'cls',
])

const GO_KEYWORDS = new Set([
  'break', 'case', 'chan', 'const', 'continue', 'default', 'defer', 'else',
  'fallthrough', 'for', 'func', 'go', 'goto', 'if', 'import', 'interface',
  'map', 'package', 'range', 'return', 'select', 'struct', 'switch', 'type',
  'var', 'true', 'false', 'nil', 'iota',
])
const GO_BUILTINS = new Set([
  'string', 'int', 'int8', 'int16', 'int32', 'int64', 'uint', 'uint8',
  'uint16', 'uint32', 'uint64', 'byte', 'rune', 'float32', 'float64',
  'bool', 'error', 'make', 'new', 'len', 'cap', 'append', 'copy', 'delete',
  'panic', 'recover', 'print', 'println',
])

const BASH_KEYWORDS = new Set([
  'if', 'then', 'else', 'elif', 'fi', 'for', 'in', 'do', 'done', 'while',
  'until', 'case', 'esac', 'function', 'return', 'break', 'continue',
  'exit', 'export', 'local', 'readonly', 'declare', 'set', 'unset', 'echo',
  'source', 'true', 'false',
])
const BASH_BUILTINS = new Set([
  'cd', 'ls', 'rm', 'mv', 'cp', 'cat', 'grep', 'sed', 'awk', 'curl', 'wget',
  'git', 'npm', 'yarn', 'pnpm', 'docker', 'kubectl', 'ssh', 'scp', 'chmod',
  'chown', 'mkdir', 'touch', 'sudo', 'env', 'printf',
])

const IDENT_RE = /^[A-Za-z_$][\w$]*/
const IDENT_PY_RE = /^[A-Za-z_][\w]*/

const RULES: Record<SupportedLanguage, LanguageRules> = {
  typescript: {
    keywords: TS_KEYWORDS,
    builtins: TS_BUILTINS,
    lineComment: '//',
    blockComment: ['/*', '*/'],
    strings: [
      { open: '"', close: '"', escape: true },
      { open: "'", close: "'", escape: true },
      { open: '`', close: '`', escape: true },
    ],
    numberRegex: /^(?:0x[0-9A-Fa-f]+|0b[01]+|0o[0-7]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/,
    identifierRegex: IDENT_RE,
    operatorChars: '+-*/%=<>!&|^~?:',
    punctuationChars: '()[]{},;.',
  },
  javascript: {
    keywords: TS_KEYWORDS,
    builtins: TS_BUILTINS,
    lineComment: '//',
    blockComment: ['/*', '*/'],
    strings: [
      { open: '"', close: '"', escape: true },
      { open: "'", close: "'", escape: true },
      { open: '`', close: '`', escape: true },
    ],
    numberRegex: /^(?:0x[0-9A-Fa-f]+|0b[01]+|0o[0-7]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/,
    identifierRegex: IDENT_RE,
    operatorChars: '+-*/%=<>!&|^~?:',
    punctuationChars: '()[]{},;.',
  },
  python: {
    keywords: PY_KEYWORDS,
    builtins: PY_BUILTINS,
    lineComment: '#',
    strings: [
      { open: '"""', close: '"""' },
      { open: "'''", close: "'''" },
      { open: '"', close: '"', escape: true },
      { open: "'", close: "'", escape: true },
    ],
    numberRegex: /^(?:0x[0-9A-Fa-f]+|0b[01]+|0o[0-7]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/,
    identifierRegex: IDENT_PY_RE,
    operatorChars: '+-*/%=<>!&|^~@',
    punctuationChars: '()[]{},;:.',
  },
  go: {
    keywords: GO_KEYWORDS,
    builtins: GO_BUILTINS,
    lineComment: '//',
    blockComment: ['/*', '*/'],
    strings: [
      { open: '"', close: '"', escape: true },
      { open: '`', close: '`' },
    ],
    numberRegex: /^(?:0x[0-9A-Fa-f]+|0b[01]+|0o[0-7]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/,
    identifierRegex: IDENT_PY_RE,
    operatorChars: '+-*/%=<>!&|^~',
    punctuationChars: '()[]{},;.:',
  },
  json: {
    keywords: new Set(['true', 'false', 'null']),
    strings: [{ open: '"', close: '"', escape: true }],
    numberRegex: /^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/,
    identifierRegex: /^[A-Za-z_][\w]*/,
    operatorChars: '',
    punctuationChars: '()[]{},:.',
  },
  bash: {
    keywords: BASH_KEYWORDS,
    builtins: BASH_BUILTINS,
    lineComment: '#',
    strings: [
      { open: '"', close: '"', escape: true },
      { open: "'", close: "'" },
    ],
    numberRegex: /^\d+/,
    identifierRegex: /^[A-Za-z_][\w]*/,
    operatorChars: '=<>!&|',
    punctuationChars: '()[]{};.',
  },
}

function startsWith(src: string, pos: number, needle: string): boolean {
  if (needle.length === 0) return false
  if (pos + needle.length > src.length) return false
  for (let i = 0; i < needle.length; i++) {
    if (src[pos + i] !== needle[i]) return false
  }
  return true
}

function emit(tokens: HighlightToken[], text: string, kind: TokenKind): void {
  if (text.length === 0) return
  const last = tokens[tokens.length - 1]
  if (last != null && last.kind === kind) {
    last.text += text
    return
  }
  tokens.push({ text, kind })
}

function tokenize(src: string, rules: LanguageRules): HighlightToken[] {
  const tokens: HighlightToken[] = []
  const bounded = src.length > MAX_CHARS ? src.slice(0, MAX_CHARS) : src
  let i = 0

  while (i < bounded.length) {
    const ch = bounded[i]
    if (ch == null) break

    // Whitespace / newlines pass through as plain
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      emit(tokens, ch, 'plain')
      i++
      continue
    }

    // Line comment
    if (rules.lineComment != null && startsWith(bounded, i, rules.lineComment)) {
      const nl = bounded.indexOf('\n', i)
      const end = nl === -1 ? bounded.length : nl
      emit(tokens, bounded.slice(i, end), 'comment')
      i = end
      continue
    }

    // Block comment
    if (rules.blockComment != null && startsWith(bounded, i, rules.blockComment[0])) {
      const endMarker = rules.blockComment[1]
      const endIdx = bounded.indexOf(endMarker, i + rules.blockComment[0].length)
      const end = endIdx === -1 ? bounded.length : endIdx + endMarker.length
      emit(tokens, bounded.slice(i, end), 'comment')
      i = end
      continue
    }

    // Strings
    let matchedString = false
    for (const s of rules.strings) {
      if (!startsWith(bounded, i, s.open)) continue
      const openLen = s.open.length
      let j = i + openLen
      while (j < bounded.length) {
        if (s.escape === true && bounded[j] === '\\' && j + 1 < bounded.length) {
          j += 2
          continue
        }
        if (startsWith(bounded, j, s.close)) {
          j += s.close.length
          break
        }
        j++
      }
      emit(tokens, bounded.slice(i, j), 'string')
      i = j
      matchedString = true
      break
    }
    if (matchedString) continue

    // Number
    const rest = bounded.slice(i)
    const numMatch = rules.numberRegex.exec(rest)
    if (numMatch != null && numMatch.index === 0) {
      emit(tokens, numMatch[0], 'number')
      i += numMatch[0].length
      continue
    }

    // Identifier / keyword / builtin
    const identMatch = rules.identifierRegex.exec(rest)
    if (identMatch != null && identMatch.index === 0) {
      const word = identMatch[0]
      if (rules.keywords.has(word)) {
        emit(tokens, word, 'keyword')
      } else if (rules.builtins?.has(word) === true) {
        emit(tokens, word, 'builtin')
      } else {
        emit(tokens, word, 'plain')
      }
      i += word.length
      continue
    }

    // Operator
    if (rules.operatorChars.includes(ch)) {
      emit(tokens, ch, 'operator')
      i++
      continue
    }

    // Punctuation
    if (rules.punctuationChars.includes(ch)) {
      emit(tokens, ch, 'punctuation')
      i++
      continue
    }

    // Fallback
    emit(tokens, ch, 'plain')
    i++
  }

  return tokens
}

/**
 * Highlight the given source code for the given language.
 * Returns a list of tokens. If the language is unsupported or source is too
 * large to safely colorize, returns a single plain token (or truncated block).
 */
export function highlight(
  source: string,
  language: string | undefined | null,
): HighlightToken[] {
  const normalized = normalizeLanguage(language)
  if (normalized == null) {
    return [{ text: source, kind: 'plain' }]
  }
  // Truncate to a safe line ceiling; callers may show a truncation hint.
  const lineCount = countLines(source)
  const src = lineCount > MAX_HIGHLIGHT_LINES
    ? truncateToLines(source, MAX_HIGHLIGHT_LINES)
    : source
  const rules = RULES[normalized]
  return tokenize(src, rules)
}

export function countLines(src: string): number {
  if (src.length === 0) return 0
  let n = 1
  for (let i = 0; i < src.length; i++) {
    if (src[i] === '\n') n++
  }
  return n
}

export function truncateToLines(src: string, maxLines: number): string {
  let count = 0
  for (let i = 0; i < src.length; i++) {
    if (src[i] === '\n') {
      count++
      if (count >= maxLines) {
        return src.slice(0, i)
      }
    }
  }
  return src
}

/**
 * Tailwind class for each token kind. Uses the Huly dark-first tokens already
 * defined in tailwind.config so highlights blend with the rest of the UI.
 */
export function classForToken(kind: TokenKind): string {
  switch (kind) {
    case 'keyword': return 'text-accent-primary'
    case 'string': return 'text-status-success'
    case 'number': return 'text-status-warning'
    case 'comment': return 'text-content-tertiary italic'
    case 'builtin': return 'text-accent-secondary'
    case 'function': return 'text-accent-secondary'
    case 'type': return 'text-accent-primary'
    case 'attr': return 'text-status-warning'
    case 'operator': return 'text-content-secondary'
    case 'punctuation': return 'text-content-secondary'
    case 'plain':
    default:
      return 'text-content-primary'
  }
}
