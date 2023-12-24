import { bronze } from './bronze'
import { dark } from './dark'
import { light } from './light'
import { local } from './local'
import { brand } from './shared'

// TODO: type def to enforce uniformity in theme palette defs

export const sharedColors = {
	brand,
}

export const themes = {
	bronze,
	dark,
	light,
	local,
}

export type Theme = keyof typeof themes
