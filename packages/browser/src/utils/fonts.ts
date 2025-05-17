export type FontFamilyKey =
	| ''
	| 'inter'
	| 'opendyslexic'
	| 'atkinsonhyperlegible'
	| 'charis'
	| 'literata'
	| 'bitter'
	| 'librebaskerville'
	| 'nunito'

export const FONT_FAMILIES: Record<FontFamilyKey, string> = {
	'': 'Arial, sans-serif', // Default
	inter: 'InterVariable, system-ui, sans-serif',
	opendyslexic: 'OpenDyslexicRegular, Arial, sans-serif',
	atkinsonhyperlegible: 'Atkinson-Hyperlegible, system-ui, sans-serif',
	charis: 'CharisSILW, serif',
	literata: 'Literata, serif',
	bitter: 'Bitter, serif',
	librebaskerville: 'Libre Baskerville, serif',
	nunito: 'Nunito, sans-serif',
}

// Helper to get proper font-family CSS value
export function getFontFamily(fontKey: string): string {
	return FONT_FAMILIES[fontKey as FontFamilyKey] || FONT_FAMILIES['']
}

// Font options for select components
export const SUPPORTED_FONT_OPTIONS = [
	{ label: 'Atkinson Hyperlegible', value: 'atkinsonhyperlegible' },
	{ label: 'Bitter', value: 'bitter' },
	{ label: 'Charis', value: 'charis' },
	{ label: 'Inter', value: 'inter' },
	{ label: 'Libre Baskerville', value: 'librebaskerville' },
	{ label: 'Literata', value: 'literata' },
	{ label: 'Nunito', value: 'nunito' },
	{ label: 'OpenDyslexic', value: 'opendyslexic' },
]
