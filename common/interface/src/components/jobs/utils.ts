export function readableKind(kind: string | null) {
	if (!kind) {
		return 'Unknown';
	}

	return kind
		.replace(/(Job|Jobs)$/, '')
		.replace(/([A-Z])/g, ' $1')
		.replace(/^./, (str) => str.toUpperCase());
}
