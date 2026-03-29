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
 * - B -> 2dp in KB, e.g. 0.24 KB
 * - KB, MB -> 0dp, e.g. 689 KB
 * - GB and up -> 2dp if small (<10), 1dp if big, e.g. 2.18 GB and 20.1 GB
 */
export function formatBytes(bytes: number | bigint | undefined | null) {
	const formattedBytes = formatBytesSeparate(bytes)
	if (formattedBytes == null) return null
	return formattedBytes.value + ' ' + formattedBytes.unit
}

/**
 * Returns an object containing the converted bytes and the unit of measurement.
 * - B -> 2dp in KB, e.g. 0.24 KB
 * - KB, MB -> 0dp, e.g. 689 KB
 * - GB and up -> 2dp if small (<10), 1dp if big, e.g. 2.18 GB and 20.1 GB
 */
export function formatBytesSeparate(bytes: number | bigint | undefined | null) {
	if (bytes == undefined) return null

	const numBytes = Number(bytes)
	const threshold =
		numBytes >= KILOBYTE
			? Math.min(Math.floor(Math.log(numBytes) / Math.log(KILOBYTE)), BYTE_UNITS.length - 1)
			: 0
	const unit = BYTE_UNITS[threshold]!
	const value = numBytes / Math.pow(KILOBYTE, threshold)

	let formattedValue: string
	let resolvedUnit = unit
	if (numBytes === 0) {
		formattedValue = '0'
		resolvedUnit = 'KB'
	} else if (unit === 'B') {
		formattedValue = (Math.max(value, 10) / 1000).toFixed(2)
		resolvedUnit = 'KB'
	} else if (unit === 'KB' || unit === 'MB') {
		formattedValue = value.toFixed(0)
	} else {
		formattedValue = value.toFixed(value < 10 ? 2 : 1)
	}

	return { value: parseFloat(formattedValue), unit: resolvedUnit }
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
