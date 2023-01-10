export async function copyTextToClipboard(text: string) {
	return await navigator?.clipboard.writeText(text)
}
