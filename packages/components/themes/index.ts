import { bronze } from './bronze'
import { dark, updatedDark } from './dark'
import { light } from './light'
import { local } from './local'
import { brand } from './shared'

export const sharedColors = {
	brand,
}

export const themes = {
	bronze,
	dark,
	light,
	local,
	updatedDark,
}

export type Theme = keyof typeof themes
export { type ThemeDefintion } from './shared'
