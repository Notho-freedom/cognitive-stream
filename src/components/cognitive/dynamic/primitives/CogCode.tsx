import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Copy, Check } from 'lucide-react';
import { useState, useMemo } from 'react';

interface CogCodeProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  maxHeight?: string;
  copyable?: boolean;
}

// Token types for syntax highlighting
type TokenType = 'keyword' | 'string' | 'number' | 'comment' | 'function' | 'operator' | 'punctuation' | 'property' | 'builtin' | 'text';

interface Token {
  type: TokenType;
  content: string;
}

// Syntax highlighting colors (using CSS variables for theming)
const TOKEN_STYLES: Record<TokenType, string> = {
  keyword: 'text-[hsl(var(--intent-secondary))]',
  string: 'text-[hsl(var(--intent-success))]',
  number: 'text-[hsl(var(--intent-warning))]',
  comment: 'text-[hsl(var(--text-ghost))] italic',
  function: 'text-[hsl(var(--intent-primary))]',
  operator: 'text-[hsl(var(--text-secondary))]',
  punctuation: 'text-[hsl(var(--text-muted))]',
  property: 'text-[hsl(187,60%,70%)]',
  builtin: 'text-[hsl(var(--intent-focus))]',
  text: 'text-[hsl(var(--text-primary))]',
};

// Language-specific keywords
const KEYWORDS: Record<string, string[]> = {
  javascript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'new', 'class', 'extends', 'import', 'export', 'default', 'from', 'async', 'await', 'try', 'catch', 'finally', 'throw', 'typeof', 'instanceof', 'in', 'of', 'this', 'super', 'null', 'undefined', 'true', 'false', 'static', 'get', 'set', 'yield'],
  typescript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'new', 'class', 'extends', 'import', 'export', 'default', 'from', 'async', 'await', 'try', 'catch', 'finally', 'throw', 'typeof', 'instanceof', 'in', 'of', 'this', 'super', 'null', 'undefined', 'true', 'false', 'static', 'get', 'set', 'yield', 'type', 'interface', 'enum', 'namespace', 'as', 'is', 'keyof', 'readonly', 'abstract', 'implements', 'public', 'private', 'protected'],
  python: ['def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'break', 'continue', 'import', 'from', 'as', 'try', 'except', 'finally', 'raise', 'with', 'lambda', 'pass', 'None', 'True', 'False', 'and', 'or', 'not', 'in', 'is', 'global', 'nonlocal', 'yield', 'async', 'await', 'assert', 'del'],
  sql: ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'DROP', 'ALTER', 'INDEX', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'GROUP', 'BY', 'ORDER', 'HAVING', 'LIMIT', 'OFFSET', 'AS', 'DISTINCT', 'NULL', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'EXISTS', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'UNIQUE', 'DEFAULT', 'CHECK', 'CONSTRAINT', 'CASCADE'],
  json: [],
  css: ['@import', '@media', '@keyframes', '@font-face', '@charset', '@supports', '@namespace', '@page', '@viewport', '@document', '@counter-style', '@font-feature-values', '!important'],
  html: ['html', 'head', 'body', 'div', 'span', 'p', 'a', 'img', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'form', 'input', 'button', 'script', 'style', 'link', 'meta', 'title', 'header', 'footer', 'nav', 'main', 'section', 'article', 'aside'],
  bash: ['if', 'then', 'else', 'elif', 'fi', 'for', 'in', 'do', 'done', 'while', 'until', 'case', 'esac', 'function', 'return', 'exit', 'export', 'source', 'alias', 'unalias', 'local', 'readonly', 'declare', 'typeset', 'set', 'unset', 'shift', 'echo', 'printf', 'read', 'cd', 'pwd', 'mkdir', 'rm', 'cp', 'mv', 'ls', 'cat', 'grep', 'sed', 'awk', 'find', 'xargs', 'sudo', 'chmod', 'chown'],
};

const BUILTINS: Record<string, string[]> = {
  javascript: ['console', 'Math', 'Array', 'Object', 'String', 'Number', 'Boolean', 'Date', 'RegExp', 'Error', 'Promise', 'JSON', 'Map', 'Set', 'WeakMap', 'WeakSet', 'Symbol', 'Proxy', 'Reflect', 'Intl', 'fetch', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURI', 'decodeURI', 'encodeURIComponent', 'decodeURIComponent'],
  typescript: ['console', 'Math', 'Array', 'Object', 'String', 'Number', 'Boolean', 'Date', 'RegExp', 'Error', 'Promise', 'JSON', 'Map', 'Set', 'WeakMap', 'WeakSet', 'Symbol', 'Proxy', 'Reflect', 'Intl', 'fetch', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURI', 'decodeURI', 'encodeURIComponent', 'decodeURIComponent', 'Partial', 'Required', 'Readonly', 'Record', 'Pick', 'Omit', 'Exclude', 'Extract', 'NonNullable', 'ReturnType', 'Parameters', 'InstanceType', 'ConstructorParameters'],
  python: ['print', 'len', 'range', 'str', 'int', 'float', 'list', 'dict', 'set', 'tuple', 'bool', 'open', 'input', 'type', 'isinstance', 'issubclass', 'hasattr', 'getattr', 'setattr', 'delattr', 'callable', 'iter', 'next', 'enumerate', 'zip', 'map', 'filter', 'reduce', 'sorted', 'reversed', 'min', 'max', 'sum', 'abs', 'round', 'pow', 'divmod', 'all', 'any', 'ord', 'chr', 'hex', 'oct', 'bin', 'format', 'repr', 'id', 'hash', 'dir', 'vars', 'help', 'super', 'object', 'staticmethod', 'classmethod', 'property'],
};

function tokenizeLine(line: string, language: string): Token[] {
  const tokens: Token[] = [];
  const keywords = KEYWORDS[language] || KEYWORDS.javascript || [];
  const builtins = BUILTINS[language] || [];
  
  // Regex patterns for different token types
  const patterns: Array<{ regex: RegExp; type: TokenType }> = [
    // Comments
    { regex: /^(\/\/.*|#.*)/, type: 'comment' },
    { regex: /^(\/\*[\s\S]*?\*\/)/, type: 'comment' },
    // Strings
    { regex: /^("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/, type: 'string' },
    // Numbers (including hex, binary, octal, floats, scientific notation)
    { regex: /^(0x[0-9a-fA-F]+|0b[01]+|0o[0-7]+|\d+\.?\d*(?:e[+-]?\d+)?|\.\d+(?:e[+-]?\d+)?)/, type: 'number' },
    // Function calls
    { regex: /^([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\s*\()/, type: 'function' },
    // Operators
    { regex: /^(===|!==|==|!=|<=|>=|=>|->|\+\+|--|&&|\|\||<<|>>|>>>|\*\*|[+\-*/%&|^~<>!=?:])/, type: 'operator' },
    // Punctuation
    { regex: /^([{}[\]();,.:@])/, type: 'punctuation' },
    // Identifiers (checked against keywords/builtins later)
    { regex: /^([a-zA-Z_$][a-zA-Z0-9_$]*)/, type: 'text' },
    // Whitespace - keep as text
    { regex: /^(\s+)/, type: 'text' },
    // Any other character
    { regex: /^(.)/, type: 'text' },
  ];
  
  let remaining = line;
  
  while (remaining.length > 0) {
    let matched = false;
    
    for (const { regex, type } of patterns) {
      const match = remaining.match(regex);
      if (match) {
        let tokenType = type;
        const content = match[1];
        
        // Check if identifier is a keyword or builtin
        if (type === 'text' && /^[a-zA-Z_$]/.test(content)) {
          if (keywords.includes(content) || keywords.includes(content.toUpperCase())) {
            tokenType = 'keyword';
          } else if (builtins.includes(content)) {
            tokenType = 'builtin';
          }
        }
        
        tokens.push({ type: tokenType, content });
        remaining = remaining.slice(content.length);
        matched = true;
        break;
      }
    }
    
    if (!matched) {
      // Fallback: consume one character
      tokens.push({ type: 'text', content: remaining[0] });
      remaining = remaining.slice(1);
    }
  }
  
  return tokens;
}

export function CogCode({
  code,
  language = 'plaintext',
  showLineNumbers = true,
  maxHeight = '300px',
  copyable = true,
}: CogCodeProps) {
  const [copied, setCopied] = useState(false);
  const lines = code.split('\n');
  
  // Normalize language name
  const normalizedLang = useMemo(() => {
    const langMap: Record<string, string> = {
      js: 'javascript',
      ts: 'typescript',
      jsx: 'javascript',
      tsx: 'typescript',
      py: 'python',
      sh: 'bash',
      shell: 'bash',
      zsh: 'bash',
    };
    return langMap[language.toLowerCase()] || language.toLowerCase();
  }, [language]);

  // Tokenize all lines
  const tokenizedLines = useMemo(() => {
    if (normalizedLang === 'plaintext') {
      return lines.map(line => [{ type: 'text' as TokenType, content: line }]);
    }
    return lines.map(line => tokenizeLine(line, normalizedLang));
  }, [lines, normalizedLang]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative group"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[hsl(var(--surface-elevated))] border border-[hsl(var(--border))] border-b-0 rounded-t-lg">
        <span className="text-xs text-[hsl(var(--text-ghost))] uppercase tracking-wider font-mono">
          {language}
        </span>
        {copyable && (
          <button
            onClick={handleCopy}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-all',
              'hover:bg-white/5',
              copied ? 'text-[hsl(var(--intent-success))]' : 'text-[hsl(var(--text-ghost))] hover:text-[hsl(var(--intent-primary))]'
            )}
          >
            {copied ? (
              <>
                <Check className="w-3 h-3" />
                <span>Copié</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copier</span>
              </>
            )}
          </button>
        )}
      </div>
      
      {/* Code block */}
      <div
        className={cn(
          'relative overflow-auto bg-[hsl(var(--surface-void))] border border-[hsl(var(--border))] rounded-b-lg',
          'scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent'
        )}
        style={{ maxHeight }}
      >
        <pre className="p-4 text-sm font-mono leading-relaxed">
          {showLineNumbers ? (
            <table className="w-full border-collapse">
              <tbody>
                {tokenizedLines.map((tokens, lineIndex) => (
                  <tr key={lineIndex} className="hover:bg-white/[0.03]">
                    <td className="pr-4 text-right text-[hsl(var(--text-ghost))] select-none w-8 align-top tabular-nums">
                      {lineIndex + 1}
                    </td>
                    <td className="whitespace-pre">
                      {tokens.length === 0 ? (
                        <span>&nbsp;</span>
                      ) : (
                        tokens.map((token, tokenIndex) => (
                          <span key={tokenIndex} className={TOKEN_STYLES[token.type]}>
                            {token.content}
                          </span>
                        ))
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <code className="whitespace-pre-wrap break-words">
              {tokenizedLines.flat().map((token, i) => (
                <span key={i} className={TOKEN_STYLES[token.type]}>
                  {token.content}
                </span>
              ))}
            </code>
          )}
        </pre>
        
        {/* Scan line effect */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
          <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-[hsl(var(--intent-primary))] to-transparent animate-scan" />
        </div>
      </div>
    </motion.div>
  );
}
