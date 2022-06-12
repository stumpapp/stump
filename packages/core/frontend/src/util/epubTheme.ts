import React from 'react';

export interface EpubTheme {
	[tag: string]: React.CSSProperties;
}

export const epubDarkTheme: EpubTheme = {
	body: { background: '#212836' },
	a: { color: '#4299E1' },
	p: { color: '#E8EDF4' },
	h1: { color: '#E8EDF4' },
	h2: { color: '#E8EDF4' },
	h3: { color: '#E8EDF4' },
	h4: { color: '#E8EDF4' },
	h5: { color: '#E8EDF4' },
};
