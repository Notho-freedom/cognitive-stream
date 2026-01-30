import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface CogCodeProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  maxHeight?: string;
  copyable?: boolean;
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
      <div className="flex items-center justify-between px-4 py-2 bg-surface-elevated border border-white/5 border-b-0 rounded-t-lg">
        <span className="text-xs text-ghost uppercase tracking-wider font-mono">
          {language}
        </span>
        {copyable && (
          <button
            onClick={handleCopy}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-all',
              'hover:bg-white/5',
              copied ? 'text-intent-success' : 'text-ghost hover:text-primary'
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
          'relative overflow-auto bg-black/40 border border-white/5 rounded-b-lg',
          'scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent'
        )}
        style={{ maxHeight }}
      >
        <pre className="p-4 text-sm font-mono leading-relaxed">
          {showLineNumbers ? (
            <table className="w-full border-collapse">
              <tbody>
                {lines.map((line, i) => (
                  <tr key={i} className="hover:bg-white/5">
                    <td className="pr-4 text-right text-ghost select-none w-8 align-top">
                      {i + 1}
                    </td>
                    <td className="text-primary-foreground whitespace-pre">
                      {line || ' '}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <code className="text-primary-foreground whitespace-pre-wrap break-words">
              {code}
            </code>
          )}
        </pre>
        
        {/* Scan line effect */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
          <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-primary to-transparent animate-scan" />
        </div>
      </div>
    </motion.div>
  );
}
