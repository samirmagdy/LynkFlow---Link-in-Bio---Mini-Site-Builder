import React, { useState } from 'react';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  avatarUrl?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  size = 'md',
  avatarUrl,
  className = '',
  style
}) => {
  const [imageFailed, setImageFailed] = useState(false);
  const sizeMap = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-10 h-10 text-sm font-semibold',
    lg: 'w-14 h-14 text-base font-bold',
    xl: 'w-20 h-20 text-xl font-bold',
    '2xl': 'w-28 h-28 text-2xl font-bold'
  };

  const getInitials = (text: string) => {
    if (!text) return 'LF';
    const parts = text.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  // Deterministic pleasing gradient based on string characters
  const getGradient = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const gradients = [
      'from-slate-700 to-slate-900',
      'from-indigo-600 to-slate-900',
      'from-stone-700 to-stone-900',
      'from-emerald-700 to-teal-950',
      'from-zinc-800 to-black',
      'from-neutral-700 to-neutral-900'
    ];
    return gradients[Math.abs(hash) % gradients.length];
  };

  return (
    <div
      role={avatarUrl && !imageFailed ? undefined : 'img'}
      aria-label={avatarUrl && !imageFailed ? undefined : name}
      className={`relative rounded-full overflow-hidden shrink-0 flex items-center justify-center select-none text-ink tracking-wider border border-ink/10 bg-gradient-to-br ${getGradient(name)} ${sizeMap[size]} ${className}`}
      style={style}
    >
      {avatarUrl && avatarUrl.trim() !== '' && !imageFailed ? (
        <img
          src={avatarUrl}
          alt={name}
          width={112}
          height={112}
          decoding="async"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </div>
  );
};
