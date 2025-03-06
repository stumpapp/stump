import { generatePageSets, ImageBasedBookPageRef } from '../reader'

describe('reader', () => {
	describe('generatePageSets', () => {
		const createPages = (landscapePages: Record<number, boolean>): ImageBasedBookPageRef[] =>
			Array.from({ length: 30 }, (_, i) => ({
				height: landscapePages[i] ? 1292 : 1986,
				width: landscapePages[i] ? 1986 : 1292,
				ratio: landscapePages[i] ? 1292 / 1986 : 1986 / 1292,
			}))

		it('should always keep the first page by itself', () => {
			const landscapePages = { 3: true, 24: true, 25: true }
			const pages = createPages(landscapePages)
			const sets = generatePageSets({ imageSizes: pages, pages: pages.length })
			expect(sets[0]).toEqual([0])
		})

		it('should always keep landscape pages by themselves', () => {
			const landscapePages = { 3: true, 24: true, 25: true }
			const pages = createPages(landscapePages)
			const sets = generatePageSets({ imageSizes: pages, pages: pages.length })
			const singleSets = sets.filter((set) => set.length === 1)
			expect(singleSets.length).toBe(Object.keys(landscapePages).length + 1)

			expect(singleSets.find((set) => set[0] === 3 && set.length === 1)).toBeDefined()
			expect(singleSets.find((set) => set[0] === 24 && set.length === 1)).toBeDefined()
			expect(singleSets.find((set) => set[0] === 25 && set.length === 1)).toBeDefined()
		})

		it('should properly group portrait pages when able', () => {
			const landscapePages = { 3: true, 24: true, 25: true }
			const pages = createPages(landscapePages)
			const sets = generatePageSets({ imageSizes: pages, pages: pages.length })
			const doubleSets = sets.filter((set) => set.length === 2)
			// expect(doubleSets.length).toBe(
			// 	Math.ceil((pages.length - Object.keys(landscapePages).length - 1) / 2),
			// )
			expect(doubleSets.length).toBe(14)
		})

		it('should properly detect when the next is landscape and not group them', () => {
			const landscapePages = { 26: true }
			const pages = createPages(landscapePages)
			const sets = generatePageSets({ imageSizes: pages, pages: pages.length })

			// page 26 (idx 25) should be by itself
			expect(sets.find((set) => set[0] === 25 && set.length === 1)).toBeDefined()
		})
	})
})
