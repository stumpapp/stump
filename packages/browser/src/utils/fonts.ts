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

/**
 * Maps font keys to their CSS font-family values
 * Each entry specifies the primary font and appropriate fallbacks
 */
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

/**
 * Returns the proper CSS font-family value for a given font key
 * Falls back to the default font if the key is not recognized
 * @param fontKey - The font identifier to look up
 * @returns The corresponding CSS font-family value
 */
export function getFontFamily(fontKey: string): string {
	return FONT_FAMILIES[fontKey as FontFamilyKey] || FONT_FAMILIES['']
}

/**
 * Font options for UI select components
 * Each option contains a human-readable label and the corresponding font key
 */
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

/**
 * Get the path to a font's assets directory or specific file
 * @param fontKey - The font identifier
 * @param file - Optional specific file to include in the path
 * @param absolute - Whether to include the origin for absolute URLs
 * @returns The path to the font's assets
 */
export function getFontPath(fontKey: FontFamilyKey, file?: string, absolute = false): string {
	if (!fontKey) return ''

	const baseUrl = absolute ? window.location.origin : ''
	const basePath = `${baseUrl}/assets/font/${fontKey}`

	return file ? `${basePath}/${file}` : basePath
}

/**
 * Get the path to a font's CSS file
 * @param fontKey - The font identifier
 * @param absolute - Whether to include the origin for absolute URLs
 * @returns The path to the font's CSS file
 */
export function getFontCssPath(fontKey: FontFamilyKey, absolute = false): string {
	return getFontPath(fontKey, `${fontKey}.css`, absolute)
}
