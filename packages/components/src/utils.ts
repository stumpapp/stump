import { ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Normalize class names using clsx and tailwind-merge */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export function cx(...inputs: ClassValue[]) {
	return clsx(...inputs)
}
