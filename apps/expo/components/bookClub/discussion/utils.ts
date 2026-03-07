export function getSenderInitials(
	sender?: {
		displayName?: string | null
		username?: string | null
	} | null,
): string {
	const name = sender?.displayName || sender?.username || '?'
	return name
		.split(' ')
		.map((part) => part[0])
		.join('')
		.toUpperCase()
		.slice(0, 2)
}
