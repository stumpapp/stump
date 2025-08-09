import { generatePageSets, ImageBasedBookPageRef } from '../reader'

describe('reader utils', () => {
	describe('generatePageSets', () => {
		const originalWarn = console.warn
		beforeAll(() => {
			console.warn = jest.fn()
		})

		afterAll(() => {
			console.warn = originalWarn
		})

		const imageSizes: Record<number, ImageBasedBookPageRef> = {
			0: { height: 1000, width: 800, ratio: 0.8 },
			1: { height: 1000, width: 800, ratio: 0.8 },
			2: { height: 1000, width: 800, ratio: 0.8 },
			3: { height: 800, width: 1000, ratio: 1.25 },
			4: { height: 1000, width: 800, ratio: 0.8 },
		}

		describe('exception cases', () => {
			it('should keep the second page in its own set only when secondPageSeparate is true', () => {
				const imageSizesSecondPageTest: Record<number, ImageBasedBookPageRef> = {
					...imageSizes,
					3: { height: 1000, width: 800, ratio: 0.8 },
					5: { height: 1000, width: 800, ratio: 0.8 },
					6: { height: 800, width: 1000, ratio: 1.25 },
				}

				const setsTrue = generatePageSets({
					imageSizes: imageSizesSecondPageTest,
					pages: 7,
					secondPageSeparate: true,
				})
				expect(setsTrue).toEqual([[0], [1], [2, 3], [4, 5], [6]])

				const setsFalse = generatePageSets({
					imageSizes: imageSizesSecondPageTest,
					pages: 7,
					secondPageSeparate: false,
				})
				expect(setsFalse).toEqual([[0], [1, 2], [3, 4], [5], [6]])
			})

			it('should always keep the first page in its own set', () => {
				const sets = generatePageSets({ imageSizes, pages: 5, secondPageSeparate: false })
				expect(sets[0]).toEqual([0])
			})

			it('should always keep the last page in its own set', () => {
				// Portrait page at the end
				let sets = generatePageSets({ imageSizes, pages: 5, secondPageSeparate: false })
				expect(sets[sets.length - 1]).toEqual([4])

				// Landscape page at the end
				sets = generatePageSets({
					imageSizes: {
						...imageSizes,
						4: { height: 800, width: 1000, ratio: 1.25 },
					},
					pages: 5,
					secondPageSeparate: false,
				})
				expect(sets[sets.length - 1]).toEqual([4])

				sets = generatePageSets({
					imageSizes: Array.from({ length: 19 }, () => ({
						height: 1000,
						width: 800,
						ratio: 0.8,
					})).reduce((acc, curr, idx) => ({ ...acc, [idx]: curr }), {}),
					pages: 19,
					secondPageSeparate: false,
				})
				expect(sets[sets.length - 1]).toEqual([18])

				sets = generatePageSets({
					imageSizes: Array.from({ length: 20 }, () => ({
						height: 1000,
						width: 800,
						ratio: 0.8,
					})).reduce((acc, curr, idx) => ({ ...acc, [idx]: curr }), {}),
					pages: 20,
					secondPageSeparate: false,
				})
				expect(sets[sets.length - 1]).toEqual([19])
			})

			it('should always keep landscape pages in their own set', () => {
				const sets = generatePageSets({
					imageSizes: {
						...imageSizes,
						5: { height: 800, width: 1000, ratio: 1.25 },
						6: { height: 800, width: 1000, ratio: 1.25 },
						7: { height: 1000, width: 800, ratio: 0.8 },
						8: { height: 1000, width: 800, ratio: 0.8 },
						9: { height: 1000, width: 800, ratio: 0.8 },
					},
					pages: 10,
					secondPageSeparate: false,
				})

				// Index 3, 5, 6 are landscape pages, 4 is not but surrounded by landscape pages
				expect(sets).toEqual([[0], [1, 2], [3], [4], [5], [6], [7, 8], [9]])
			})
		})

		it('should emit a warning if the image size ratio does not match the expected ratio', () => {
			const imageSizesWithMismatch: Record<number, ImageBasedBookPageRef> = {
				0: { height: 1000, width: 800, ratio: 0.8 },
				1: { height: 1000, width: 800, ratio: 0.9 }, // Mismatched ratio
			}
			generatePageSets({ imageSizes: imageSizesWithMismatch, pages: 2, secondPageSeparate: false })
			expect(console.warn).toHaveBeenCalledWith(
				expect.stringContaining('Image size ratio mismatch for page 2'),
				expect.objectContaining({ width: 800, height: 1000 }),
			)
		})
	})
})
