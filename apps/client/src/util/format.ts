const KILOBYTE = 1024;
const BYTE_UNITS = ['B', 'KB', 'MiB', 'GB', 'TB'];

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
