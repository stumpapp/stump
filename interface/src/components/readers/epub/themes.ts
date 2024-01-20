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
