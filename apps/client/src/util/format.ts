// Note: ~technically~ 1024 is correct, but it always differed from what my computer natively reported.
// I care more about matching a users reported byte conversion, and 1000 seems to do the trick
// for me in my testing.
const KILOBYTE = 1000;
const BYTE_UNITS = ['B', 'KB', 'MiB', 'GB', 'TB'];

/**
 * Returns a formatted string for converted bytes and unit of measurement.
 */
export function formatBytes(bytes?: number, decimals = 2) {
	if (bytes == undefined) return null;

	let precision = decimals >= 0 ? decimals : 0;
	let threshold = Math.floor(Math.log(bytes) / Math.log(KILOBYTE));

	return (
		parseFloat((bytes / Math.pow(KILOBYTE, threshold)).toFixed(precision)) +
		' ' +
		BYTE_UNITS[threshold]
	);
}

/**
 * Returns an object containing the converted bytes and the unit of measurement.
 */
export function formatBytesSeparate(bytes?: number, decimals = 2) {
	if (bytes == undefined) return null;

	let precision = decimals >= 0 ? decimals : 0;
	let threshold = Math.floor(Math.log(bytes) / Math.log(KILOBYTE));

	return {
		value: parseFloat((bytes / Math.pow(KILOBYTE, threshold)).toFixed(precision)),
		unit: BYTE_UNITS[threshold],
	};
}
