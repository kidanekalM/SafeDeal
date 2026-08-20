import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  to?: string;
  href?: string;
};

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-[#014d46] text-white hover:bg-[#02665c] active:bg-[#013733]',
  secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300',
  outline:
    'border border-[#014d46] text-[#014d46] hover:bg-[#e6f7f4] active:bg-[#ccefe8]',
  ghost: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
  danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-10 px-3.5 text-xs gap-1.5',
  md: 'h-11 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', to, href, type, ...props }, ref) => {
    const classes = cn(
      'inline-flex items-center justify-center rounded-xl font-semibold transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#02665c] focus-visible:ring-offset-2',
      'disabled:opacity-50 disabled:pointer-events-none ring-offset-white',
      variants[variant],
      sizes[size],
      className
    );

    if (to) {
      return (
        <Link to={to} className={classes}>
          {props.children}
        </Link>
      );
    }

    if (href) {
      return (
        <a href={href} className={classes}>
          {props.children}
        </a>
      );
    }

    return (
      <button
        ref={ref}
        type={type ?? 'button'}
        className={classes}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';