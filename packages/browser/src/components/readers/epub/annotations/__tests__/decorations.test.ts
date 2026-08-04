import { DecorationStyleType } from '@readium/navigator'

import { annotationsToDecorations, annotationToDecoration } from '../decorations'
import { DEFAULT_HIGHLIGHT_TINT, type EpubAnnotation } from '../types'

function buildAnnotation(overrides: Partial<EpubAnnotation> = {}): EpubAnnotation {
	return {
		id: 'annotation-1',
		mediaId: 'media-1',
		userId: 'user-1',
		annotationText: null,
		createdAt: '2026-01-01T00:00:00Z',
		updatedAt: '2026-01-01T00:00:00Z',
		locator: {
			href: '/resource/chapter-1.xhtml',
			type: 'application/xhtml+xml',
			chapterTitle: 'Chapter One',
			locations: { position: 1, progression: 0.1 },
			text: { highlight: 'highlighted text' },
		},
		...overrides,
	}
}

describe('annotationToDecoration', () => {
	it('maps the annotation id, tint, and highlight text onto a Decoration', () => {
		const decoration = annotationToDecoration(buildAnnotation())

		expect(decoration?.id).toBe('annotation-1')
		expect(decoration?.style).toEqual({
			type: DecorationStyleType.Highlight,
			tint: DEFAULT_HIGHLIGHT_TINT,
			isActive: true,
		})
		expect(decoration?.locator.href).toBe('/resource/chapter-1.xhtml')
		expect(decoration?.locator.text?.highlight).toBe('highlighted text')
		expect(decoration?.extras).toEqual({ annotationText: null, mediaId: 'media-1' })
	})

	it('applies a custom tint when provided', () => {
		const decoration = annotationToDecoration(buildAnnotation(), '#ff0000')
		expect(decoration?.style).toMatchObject({ tint: '#ff0000' })
	})

	it('carries the note text through to decoration extras', () => {
		const decoration = annotationToDecoration(buildAnnotation({ annotationText: 'my note' }))
		expect(decoration?.extras).toMatchObject({ annotationText: 'my note' })
	})

	it('returns null when the locator has no href to anchor the decoration', () => {
		const decoration = annotationToDecoration(
			buildAnnotation({ locator: { href: '', type: 'application/xhtml+xml' } }),
		)
		expect(decoration).toBeNull()
	})
})

describe('annotationsToDecorations', () => {
	it('maps a list of annotations, skipping any without a resolvable locator', () => {
		const annotations = [
			buildAnnotation({ id: 'a' }),
			buildAnnotation({ id: 'b', locator: { href: '', type: 'application/xhtml+xml' } }),
			buildAnnotation({ id: 'c' }),
		]

		const decorations = annotationsToDecorations(annotations)

		expect(decorations.map((decoration) => decoration.id)).toEqual(['a', 'c'])
	})

	it('returns an empty array for an empty annotation list', () => {
		expect(annotationsToDecorations([])).toEqual([])
	})
})
