// Note: ~technically~ 1024 is correct, but it always differed from what my computer natively reported.
// I care more about matching a users reported byte conversion, and 1000 seems to do the trick

import { Media } from '@stump/types'

// for me in my testing.
const KILOBYTE = 1000
const BYTE_UNITS = ['B', 'KB', 'MiB', 'GB', 'TB']

/**
 * Returns a formatted string for converted bytes and unit of measurement.
 */
export function formatBytes(bytes?: number | bigint, decimals = 2, zeroUnit = 'GB') {
	if (bytes == undefined) return null

	const precision = decimals >= 0 ? decimals : 0

	if (bytes === 0) {
		return parseFloat((0).toFixed(precision)) + ' ' + zeroUnit
	}

	if (typeof bytes !== 'bigint') {
		const threshold = Math.floor(Math.log(bytes) / Math.log(KILOBYTE))

		return (
			parseFloat((bytes / Math.pow(KILOBYTE, threshold)).toFixed(precision)) +
			' ' +
			BYTE_UNITS[threshold]
		)
	} else {
		// FIXME: I don't think this is safe!!!
		const threshold = Math.floor(Math.log(Number(bytes)) / Math.log(KILOBYTE))

		return (
			parseFloat((Number(bytes) / Math.pow(KILOBYTE, threshold)).toFixed(precision)) +
			' ' +
			BYTE_UNITS[threshold]
		)
	}
}

/**
 * Returns an object containing the converted bytes and the unit of measurement.
 */
export function formatBytesSeparate(bytes?: number | bigint, decimals = 2, zeroUnit = 'GB') {
	if (bytes == undefined) return null

	const precision = decimals >= 0 ? decimals : 0

	if (bytes === 0) {
		return {
			unit: zeroUnit,
			value: parseFloat((0).toFixed(precision)),
		}
	}

	if (typeof bytes !== 'bigint') {
		const threshold = Math.floor(Math.log(bytes) / Math.log(KILOBYTE))

		return {
			unit: BYTE_UNITS[threshold],
			value: parseFloat((bytes / Math.pow(KILOBYTE, threshold)).toFixed(precision)),
		}
	} else {
		// FIXME: I don't think this is safe!!!
		const threshold = Math.floor(Math.log(Number(bytes)) / Math.log(KILOBYTE))

		return {
			unit: BYTE_UNITS[threshold],
			value: parseFloat((Number(bytes) / Math.pow(KILOBYTE, threshold)).toFixed(precision)),
		}
	}
}

/**
 * A helper function to format a book's name. This will first pull from metadata if it exists, and then fallback to the filename,
 * removing any file extension if present.
 *
 * @param book The book to get the name of
 */
export const formatBookName = (book: Media) =>
	book.metadata?.title || book.name.replace(/\.[^/.]+$/, '')
