import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export type PickSelect<T, K extends keyof T> = T[K]
export type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never }
export type XOR<T, U> = T | U extends object ? (Without<T, U> & U) | (Without<U, T> & T) : T | U

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}
