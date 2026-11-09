/** Resolve bundled assets and native links against the server's configured base path. */
export function publicUrl(path: string): string {
	const basePath = document.querySelector('base')?.getAttribute('href') || '/'
	return `${basePath}${path.replace(/^\/+/, '')}`
}
