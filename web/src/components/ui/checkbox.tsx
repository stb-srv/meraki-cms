import * as React from 'react';
import { cn } from '@/lib/utils';

/** Native Checkbox mit konsistentem Styling (akzentfarbig). */
export const Checkbox = React.forwardRef<
    HTMLInputElement,
    Omit<React.ComponentProps<'input'>, 'type'>
>(({ className, ...props }, ref) => (
    <input
        ref={ref}
        type="checkbox"
        className={cn('h-4 w-4 cursor-pointer rounded border-input accent-primary', className)}
        {...props}
    />
));
Checkbox.displayName = 'Checkbox';
