import React from 'react';
import * as LucideIcons from 'lucide-react';
import type { LucideIcon, LucideProps } from 'lucide-react';

interface IconProps extends LucideProps {
  name: string;
  fallback?: string;
}

const iconMap = LucideIcons as unknown as Record<string, LucideIcon>;

const Icon: React.FC<IconProps> = ({ name, fallback = 'CircleAlert', ...props }) => {
  const IconComponent = iconMap[name];
  const FallbackIcon = iconMap[fallback];

  if (IconComponent) return <IconComponent {...props} />;
  if (FallbackIcon) return <FallbackIcon {...props} />;
  return <span className="text-xs text-gray-400">[icon]</span>;
};

export default Icon;
