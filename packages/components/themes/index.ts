import { bronze } from './bronze'
import { dark } from './dark'
import { light } from './light'
import { brand } from './shared'

export const sharedColors = {
	brand,
}

export const themes = {
	bronze,
	dark,
	light,
}

export type Theme = keyof typeof themes
