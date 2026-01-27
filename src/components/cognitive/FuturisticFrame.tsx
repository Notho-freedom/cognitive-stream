import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface FuturisticFrameProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'minimal';
  animated?: boolean;
}

/**
 * FuturisticFrame - Bordures angulaires style GX/Sci-Fi
 * Coins biseautés, lignes tech, design HUD futuriste
 */
export function FuturisticFrame({ 
  children, 
  className,
  variant = 'primary',
  animated = true 
}: FuturisticFrameProps) {
  const colors = {
    primary: {
      main: 'hsl(187, 85%, 53%)',
      dim: 'hsl(187, 85%, 35%)',
      glow: 'hsl(187, 100%, 60%)',
    },
    secondary: {
      main: 'hsl(270, 80%, 65%)',
      dim: 'hsl(270, 80%, 45%)',
      glow: 'hsl(270, 100%, 72%)',
    },
    minimal: {
      main: 'hsl(220, 15%, 45%)',
      dim: 'hsl(220, 15%, 30%)',
      glow: 'hsl(220, 15%, 55%)',
    },
  }[variant];

  // Corner cut sizes
  const cornerSize = 24;
  const smallCorner = 6;

  return (
    <div className={cn('relative', className)}>
      {/* Main container with clipped corners */}
      <div
        className="relative"
        style={{
          clipPath: `polygon(
            ${cornerSize}px 0%, 
            calc(100% - ${smallCorner}px) 0%, 
            100% ${smallCorner}px, 
            100% calc(100% - ${cornerSize}px), 
            calc(100% - ${cornerSize}px) 100%, 
            ${smallCorner}px 100%, 
            0% calc(100% - ${smallCorner}px), 
            0% ${cornerSize}px
          )`,
        }}
      >
        {/* Background */}
        <div 
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, 
              hsl(220, 22%, 10%) 0%, 
              hsl(220, 22%, 7%) 50%,
              hsl(220, 22%, 9%) 100%
            )`,
          }}
        />
        
        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(${colors.main}20 1px, transparent 1px),
              linear-gradient(90deg, ${colors.main}20 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px',
          }}
        />

        {/* Content */}
        <div className="relative z-10">
          {children}
        </div>
      </div>

      {/* SVG Border Frame - Top Left to Right */}
      <svg 
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
        style={{ overflow: 'visible' }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={`border-grad-${variant}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.glow} stopOpacity="0.9" />
            <stop offset="40%" stopColor={colors.main} stopOpacity="0.4" />
            <stop offset="60%" stopColor={colors.dim} stopOpacity="0.3" />
            <stop offset="100%" stopColor={colors.glow} stopOpacity="0.7" />
          </linearGradient>
        </defs>
      </svg>

      {/* Corner accents - Top Left */}
      <motion.div 
        className="absolute -top-px -left-px"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <svg width={cornerSize + 8} height={cornerSize + 8} className="overflow-visible">
          {/* Diagonal cut line */}
          <motion.line 
            x1="0" y1={cornerSize} 
            x2={cornerSize} y2="0" 
            stroke={colors.glow}
            strokeWidth="1.5"
            style={{ filter: `drop-shadow(0 0 3px ${colors.glow})` }}
            animate={{ 
              strokeOpacity: [0.7, 1, 0.7],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Corner dot - pulsing */}
          <motion.circle 
            cx={cornerSize - 2} 
            cy="2" 
            r="2" 
            fill={colors.glow}
            style={{ filter: `drop-shadow(0 0 4px ${colors.glow})` }}
            animate={{ 
              r: [2, 2.5, 2],
              opacity: [0.8, 1, 0.8],
            }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Tech tick marks - animated */}
          <motion.line 
            x1="0" y1={cornerSize - 4} x2="0" y2={cornerSize + 4} 
            stroke={colors.main} strokeWidth="1" 
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
          />
          <motion.line 
            x1={cornerSize - 4} y1="0" x2={cornerSize + 4} y2="0" 
            stroke={colors.main} strokeWidth="1"
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
          />
        </svg>
      </motion.div>

      {/* Corner accents - Bottom Right */}
      <motion.div 
        className="absolute -bottom-px -right-px"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
      >
        <svg width={cornerSize + 8} height={cornerSize + 8} className="overflow-visible">
          <motion.line 
            x1="8" y1={cornerSize + 8} 
            x2={cornerSize + 8} y2="8" 
            stroke={colors.glow}
            strokeWidth="1.5"
            style={{ filter: `drop-shadow(0 0 3px ${colors.glow})` }}
            animate={{ 
              strokeOpacity: [0.7, 1, 0.7],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          />
          <motion.circle 
            cx="10" 
            cy={cornerSize + 6} 
            r="2" 
            fill={colors.glow}
            style={{ filter: `drop-shadow(0 0 4px ${colors.glow})` }}
            animate={{ 
              r: [2, 2.5, 2],
              opacity: [0.8, 1, 0.8],
            }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
          />
        </svg>
      </motion.div>

      {/* Top edge accent line */}
      <div className="absolute top-0 left-[32px] right-[12px] h-px overflow-hidden">
        <motion.div
          className="h-full"
          style={{
            background: `linear-gradient(90deg, ${colors.glow}, ${colors.dim}50, ${colors.main}30)`,
          }}
          initial={{ scaleX: 0, originX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      {/* Bottom edge accent */}
      <div className="absolute bottom-0 left-[12px] right-[32px] h-px overflow-hidden">
        <motion.div
          className="h-full"
          style={{
            background: `linear-gradient(90deg, ${colors.main}30, ${colors.dim}50, ${colors.glow})`,
          }}
          initial={{ scaleX: 0, originX: 1 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.25, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      {/* Left edge accent */}
      <div className="absolute left-0 top-[32px] bottom-[12px] w-px overflow-hidden">
        <motion.div
          className="w-full h-full"
          style={{
            background: `linear-gradient(180deg, ${colors.glow}, ${colors.dim}30, ${colors.main}20)`,
          }}
          initial={{ scaleY: 0, originY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        />
      </div>

      {/* Right edge accent */}
      <div className="absolute right-0 top-[12px] bottom-[32px] w-px overflow-hidden">
        <motion.div
          className="w-full h-full"
          style={{
            background: `linear-gradient(180deg, ${colors.main}20, ${colors.dim}30, ${colors.glow})`,
          }}
          initial={{ scaleY: 0, originY: 1 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: 0.25, duration: 0.4 }}
        />
      </div>

      {/* Scan line effect */}
      {animated && (
        <motion.div 
          className="absolute left-0 right-0 h-[2px] pointer-events-none"
          style={{
            background: `linear-gradient(90deg, transparent, ${colors.glow}80, transparent)`,
            boxShadow: `0 0 8px ${colors.glow}60`,
            clipPath: `polygon(
              ${cornerSize}px 0%, 
              calc(100% - ${smallCorner}px) 0%, 
              100% 100%, 
              0% 100%
            )`,
          }}
          initial={{ top: '0%', opacity: 0 }}
          animate={{ 
            top: ['0%', '100%', '0%'],
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      )}

      {/* Corner brackets - decorative with animation */}
      <motion.div 
        className="absolute top-1 right-2 w-3 h-3 border-t border-r"
        style={{ borderColor: colors.main }}
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className="absolute bottom-1 left-2 w-3 h-3 border-b border-l"
        style={{ borderColor: colors.main }}
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
      />

      {/* Additional tech decorations - animated dots */}
      <motion.div 
        className="absolute top-3 right-8 flex gap-1"
        animate={{ opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
      >
        <div className="w-1 h-1 rounded-full" style={{ backgroundColor: colors.dim }} />
        <div className="w-1 h-1 rounded-full" style={{ backgroundColor: colors.main }} />
        <div className="w-1 h-1 rounded-full" style={{ backgroundColor: colors.dim }} />
      </motion.div>

      <motion.div 
        className="absolute bottom-3 left-8 flex gap-1"
        animate={{ opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      >
        <div className="w-1 h-1 rounded-full" style={{ backgroundColor: colors.dim }} />
        <div className="w-1 h-1 rounded-full" style={{ backgroundColor: colors.main }} />
        <div className="w-1 h-1 rounded-full" style={{ backgroundColor: colors.dim }} />
      </motion.div>
    </div>
  );
}
