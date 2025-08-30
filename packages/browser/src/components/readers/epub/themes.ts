import { BookPreferences } from '@stump/client'
import { SupportedFont } from '@stump/graphql'

export interface EpubTheme {
	[tag: string]: object
}

// TODO: I think we should use a CSS-in-JS library for this? This way, I can do things like:
// blockquote: {p: {color: '...'}}

// Note: Not React CSS, has to be true CSS fields. E.g. font-size not fontSize.
export const stumpDark: EpubTheme = {
	a: { color: '#4299E1' },
	blockquote: { color: 'rgb(168 172 176) !important' },
	body: { background: '#161719 !important', color: '#E8EDF4' },
	h1: { color: '#E8EDF4' },
	h2: { color: '#E8EDF4' },
	h3: { color: '#E8EDF4' },
	h4: { color: '#E8EDF4' },
	h5: { color: '#E8EDF4' },
	p: { color: '#E8EDF4 !important', 'font-size': 'unset' },
	span: { color: '#E8EDF4' },
	ul: { color: '#E8EDF4' },
}

export const applyTheme = (theme: EpubTheme, preferences: BookPreferences) => {
	const fontFamily = preferences.fontFamily
		? `${toFamilyName(preferences.fontFamily as SupportedFont)} !important`
		: undefined
	const fontStyles = {
		...(fontFamily ? { 'font-family': fontFamily } : {}),
		...(preferences.lineHeight ? { 'line-height': `${preferences.lineHeight}` } : {}),
	}

	return {
		a: {
			...theme.a,
			...fontStyles,
		},
		blockquote: {
			...theme.blockquote,
			...fontStyles,
		},
		body: {
			...theme.body,
			...fontStyles,
		},
		h1: {
			...theme.h1,
			...fontStyles,
		},
		h2: {
			...theme.h2,
			...fontStyles,
		},
		h3: {
			...theme.h3,
			...fontStyles,
		},
		h4: {
			...theme.h4,
			...fontStyles,
		},
		h5: {
			...theme.h5,
			...fontStyles,
		},
		p: {
			...theme.p,
			...fontStyles,
		},
		span: {
			...theme.span,
			...fontStyles,
		},
		ul: {
			...theme.ul,
			...fontStyles,
		},
	}
}

const toFamilyName = (font: SupportedFont) => {
	switch (font) {
		case SupportedFont.Inter:
			return 'Inter var'
		case SupportedFont.OpenDyslexic:
			return 'OpenDyslexic'
		case SupportedFont.AtkinsonHyperlegible:
			return 'Atkinson Hyperlegible'
		case SupportedFont.Charis:
			return 'Charis SIL'
		case SupportedFont.Literata:
			return 'Literata'
		case SupportedFont.Bitter:
			return 'Bitter'
		case SupportedFont.LibreBaskerville:
			return 'Libre Baskerville'
		case SupportedFont.Nunito:
			return 'Nunito'
		default:
			return font
	}
}
