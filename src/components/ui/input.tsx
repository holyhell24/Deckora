import { cva } from 'class-variance-authority';
import { clsx } from 'clsx';
import type { ComponentProps } from 'react';
import { twMerge } from 'tailwind-merge';

const inputStyles = cva(
  'min-h-11 w-full rounded-lg border border-white/15 bg-white/5 px-3 text-base text-stone-100 focus-visible:outline-2 focus-visible:outline-amber-200',
);

type InputProps = ComponentProps<'input'>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input className={twMerge(clsx(inputStyles(), className))} {...props} />
  );
}
