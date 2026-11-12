import { cva } from 'class-variance-authority';
import { clsx } from 'clsx';
import type { ComponentProps } from 'react';
import { twMerge } from 'tailwind-merge';

const selectStyles = cva(
  'min-h-11 appearance-none rounded-lg border border-white/15 bg-surface px-3 pr-9 text-sm text-stone-100 focus-visible:outline-2 focus-visible:outline-amber-200 select-control',
);

type SelectProps = ComponentProps<'select'>;

export function Select({ className, ...props }: SelectProps) {
  return (
    <select className={twMerge(clsx(selectStyles(), className))} {...props} />
  );
}
