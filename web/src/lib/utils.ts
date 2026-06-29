import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Tailwind-sichere Klassen-Komposition (shadcn-Standard). */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
