import { useEffect, useMemo, useState } from 'react'

import { useReaderStore } from '~/stores'

import { ImageBasedBookPageRef } from './context'

/**
 * Represents errors that can occur when parsing page dimensions
 */
export class PageDimensionParserError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'PageDimensionParserError'
	}

	static expectedHeightWidth(input: string): PageDimensionParserError {
		return new PageDimensionParserError(`Error parsing ${input}, expected height and width`)
	}

	static malformedRunSyntax(input: string): PageDimensionParserError {
		return new PageDimensionParserError(`Error parsing ${input}, malformed run syntax`)
	}

	static errorParsingInt(input: string): PageDimensionParserError {
		return new PageDimensionParserError(`Failed to parse number: ${input}`)
	}
}

/**
 * Represents a page dimension for a page of a media item.
 * It consists of a height and a width.
 */
export class PageDimension {
	public height: number
	public width: number
	public ratio: number

	constructor(height: number, width: number) {
		this.height = height
		this.width = width
		this.ratio = width / height
	}

	/**
	 * Creates a new PageDimension with the specified height and width
	 */
	static new(height: number, width: number): PageDimension {
		return new PageDimension(height, width)
	}

	/**
	 * Converts PageDimension to string representation
	 */
	toString(): string {
		return `${this.height},${this.width}`
	}

	/**
	 * Creates a PageDimension from string representation
	 */
	static fromString(s: string): PageDimension {
		// Trim leading/trailing whitespace
		const trimmed = s.trim()

		// Check for correct layout
		const dims = trimmed.split(',')
		if (dims.length !== 2) {
			throw PageDimensionParserError.expectedHeightWidth(s)
		}

		// Parse values
		const height = parseInt(dims[0].trim(), 10)
		const width = parseInt(dims[1].trim(), 10)

		if (isNaN(height)) {
			throw PageDimensionParserError.errorParsingInt(dims[0])
		}

		if (isNaN(width)) {
			throw PageDimensionParserError.errorParsingInt(dims[1])
		}

		return new PageDimension(height, width)
	}

	/**
	 * Checks if this PageDimension equals another PageDimension
	 */
	equals(other: PageDimension): boolean {
		return this.height === other.height && this.width === other.width
	}
}

/**
 * Serializes an array of PageDimension as a string.
 *
 * The serialization uses comma-separation for height and width in PageDimension, and semicolon-separation
 * for each PageDimension object. Additionally, it uses a form of deduplication that encodes a run of n > 1
 * PageDimensions as "n>height,width". An empty array serializes to "".
 */
export function dimensionArrayToString(list: PageDimension[]): string {
	const encodedStrings: string[] = []
	let runCount = 0
	let runDimension: PageDimension | null = null

	// Loop over each of the items in the list to be encoded
	for (const nextDim of list) {
		if (runDimension && runDimension.equals(nextDim)) {
			// If there's already a run going and it matches the next, increment the counter
			runCount += 1
		} else {
			// If there's either a run going and it doesn't match, or no run...
			// This branch handles write-out if a run is going and it didn't match
			if (runDimension) {
				if (runCount > 1) {
					encodedStrings.push(`${runCount}>${runDimension.toString()}`)
				} else {
					encodedStrings.push(runDimension.toString())
				}
			}

			// In either case, we need to set the run and reset the count
			runDimension = nextDim
			runCount = 1
		}
	}

	// This handles write-out for the final item
	if (runDimension) {
		if (runCount > 1) {
			encodedStrings.push(`${runCount}>${runDimension.toString()}`)
		} else {
			encodedStrings.push(runDimension.toString())
		}
	}

	return encodedStrings.join(';')
}

export function dimensionArrayFromString(s: string): PageDimension[] {
	// Early return for an empty string
	if (s.length === 0) {
		return []
	}

	// Trim leading/trailing whitespace
	const trimmed = s.trim()
	const chunks = trimmed.split(';')

	// This will be under-capacity unless every dimension pair differs, but that's fine
	const outList: PageDimension[] = []

	// Loop over each encoded chunk
	for (const encodedStr of chunks) {
		if (encodedStr.includes('>')) {
			// Handle case where there's multiple of something
			const items = encodedStr.split('>')

			// Sanity check
			if (items.length !== 2) {
				throw PageDimensionParserError.malformedRunSyntax(encodedStr)
			}

			// Parse number
			const numRepeated = parseInt(items[0], 10)
			if (isNaN(numRepeated)) {
				throw PageDimensionParserError.errorParsingInt(items[0])
			}

			// Parse dimension
			const dimension = PageDimension.fromString(items[1])

			// Push as many as we need
			for (let i = 0; i < numRepeated; i++) {
				outList.push(dimension)
			}
		} else {
			outList.push(PageDimension.fromString(encodedStr))
		}
	}

	return outList
}

type Params = {
	bookID: string
	imageSizes?: ImageBasedBookPageRef[]
}
export function useDimensions({ bookID, imageSizes }: Params) {
	const bookCache = useReaderStore((store) => store.bookCache[bookID])
	const setBookCache = useReaderStore((store) => store.setBookCache)

	const cachedDimensions = useMemo(
		() => (bookCache?.dimensions ? dimensionArrayFromString(bookCache.dimensions) : []),
		[bookCache],
	)

	const [sizes, setSizes] = useState<ImageBasedBookPageRef[]>(
		!!imageSizes && imageSizes.length > cachedDimensions.length ? imageSizes : cachedDimensions,
	)

	console.log('sizes', sizes)

	useEffect(() => {
		return () => {
			// setBookCache(bookID, {
			// 	dimensions: dimensionArrayToString(
			// 		sizes.map((size) => PageDimension.new(size.height, size.width)),
			// 	),
			// })
			console.log('setBookCache', {
				str: dimensionArrayToString(
					sizes.map((size) => PageDimension.new(size.height, size.width)),
				),
				sizes,
			})
		}
	}, [])

	return {
		sizes,
		setSizes,
	}
}
