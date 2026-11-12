import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';
import type { ComponentProps } from 'react';
import { twMerge } from 'tailwind-merge';

const buttonVariants = cva(
  'touch-manipulation inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-slate-900 text-white hover:bg-slate-700',
        secondary:
          'border border-slate-300 bg-white text-slate-900 hover:bg-slate-100',
      },
      size: {
        sm: 'h-11 sm:h-8 px-3 text-sm',
        md: 'min-h-11 sm:min-h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants>;

export function Button({
  className,
  variant,
  size,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={twMerge(clsx(buttonVariants({ variant, size }), className))}
      {...props}
    />
  );
}
