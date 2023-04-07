export async function copyTextToClipboard(text: string) {
	return await navigator?.clipboard.writeText(text)
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function noop() {}
