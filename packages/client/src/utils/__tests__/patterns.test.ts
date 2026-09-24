import { describe, expect, it } from 'vitest'

import { ARCHIVE_EXTENSION, EBOOK_EXTENSION, PDF_EXTENSION } from '../patterns'

describe('EBOOK_EXTENSION', () => {
	it.each(['epub', 'EPUB', 'ePuB'])('matches %s', (ext) =>
		expect(EBOOK_EXTENSION.test(ext)).toBe(true),
	)
})

describe('PDF_EXTENSION', () => {
	it.each(['pdf', 'PDF', 'PdF'])('matches %s', (ext) => expect(PDF_EXTENSION.test(ext)).toBe(true))
})

describe('ARCHIVE_EXTENSION', () => {
	it.each(['cbr', 'cbz', 'zip', 'rar', 'CBR', 'CBZ', 'ZIP', 'RAR', 'cBr', 'cBz', 'zIp', 'rAr'])(
		'matches %s',
		(ext) => expect(ARCHIVE_EXTENSION.test(ext)).toBe(true),
	)
})
