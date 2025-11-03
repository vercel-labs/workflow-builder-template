'use client';

import { useTheme } from 'next-themes';
import Image from 'next/image';

interface IntegrationIconProps {
  integration: 'linear' | 'resend' | 'slack' | 'ai-gateway';
  className?: string;
}

export function IntegrationIcon({ integration, className = 'h-3 w-3' }: IntegrationIconProps) {
  const { theme, systemTheme } = useTheme();
  const currentTheme = theme === 'system' ? systemTheme : theme;

  const iconMap = {
    linear: '/integrations/linear.svg',
    resend:
      currentTheme === 'dark' ? '/integrations/resend-light.svg' : '/integrations/resend-dark.svg',
    slack: '/integrations/slack.svg',
    'ai-gateway': '/integrations/cloudflare.svg',
  };

  return (
    <Image
      src={iconMap[integration]}
      alt={`${integration} logo`}
      width={12}
      height={12}
      className={className}
    />
  );
}
