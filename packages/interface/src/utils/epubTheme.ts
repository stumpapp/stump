export interface EpubTheme {
	[tag: string]: object
}

// Note: Not React CSS, has to be true CSS fields. E.g. font-size not fontSize.
export const epubDarkTheme: EpubTheme = {
	a: { color: '#4299E1' },
	body: { background: '#212836' },
	h1: { color: '#E8EDF4' },
	h2: { color: '#E8EDF4' },
	h3: { color: '#E8EDF4' },
	h4: { color: '#E8EDF4' },
	h5: { color: '#E8EDF4' },
	p: { color: '#E8EDF4', 'font-size': 'unset' },
}
