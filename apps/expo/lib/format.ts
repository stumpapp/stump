const KILOBYTE = 1000
export const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const
export type ByteUnit = (typeof BYTE_UNITS)[number]
export const BYTE_UNIT_NAMES: Record<ByteUnit, string> = {
	B: 'Byte',
	KB: 'Kilobyte',
	MB: 'Megabyte',
	GB: 'Gigabyte',
	TB: 'Terabyte',
}

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
			unit: zeroUnit as ByteUnit,
			value: parseFloat((0).toFixed(precision)),
		}
	}

	if (typeof bytes !== 'bigint') {
		const threshold = Math.floor(Math.log(bytes) / Math.log(KILOBYTE))

		return {
			unit: BYTE_UNITS[threshold] as ByteUnit,
			value: parseFloat((bytes / Math.pow(KILOBYTE, threshold)).toFixed(precision)),
		}
	} else {
		// FIXME: I don't think this is safe!!!
		const threshold = Math.floor(Math.log(Number(bytes)) / Math.log(KILOBYTE))

		return {
			unit: BYTE_UNITS[threshold] as ByteUnit,
			value: parseFloat((Number(bytes) / Math.pow(KILOBYTE, threshold)).toFixed(precision)),
		}
	}
}

export const humanizeByteUnit = (value: number | bigint, unit: ByteUnit): string => {
	if (value === 1) {
		return `${BYTE_UNIT_NAMES[unit]}`
	}
	return `${BYTE_UNIT_NAMES[unit]}s`
}

// Note: GraphQL Decimals are strings, but come back as an any type. This will try to
// parse a string (e.g., "0.543") into a number.
export const parseGraphQLDecimal = (value: unknown): number | null => {
	if (typeof value === 'string') {
		const parsed = parseFloat(value)
		return isNaN(parsed) ? null : parsed
	} else if (typeof value === 'number') {
		return value
	}
	return null
}
