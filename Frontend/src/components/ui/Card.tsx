import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  padding?: 'none' | 'sm' | 'md';
};

const paddingMap = {
  none: '',
  sm: 'p-4 sm:p-6',
  md: 'p-6 sm:p-8',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, padding = 'md', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl border border-gray-100 bg-white text-gray-950 shadow-sm',
        paddingMap[padding],
        className
      )}
      {...props}
    />
  )
);

Card.displayName = 'Card';