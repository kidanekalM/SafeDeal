import { type LabelHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type FieldLabelProps = LabelHTMLAttributes<HTMLLabelElement> & {
  required?: boolean;
};

export function FieldLabel({ className, required, children, ...props }: FieldLabelProps) {
  return (
    <label
      className={cn(
        'mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-gray-500',
        className
      )}
      {...props}
    >
      {children}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );
}