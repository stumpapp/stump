import path from 'path'

export { default } from './preset'

type ContentHandler = {
	/**
	 * The path of the project which is loading the tailwind plugin,
	 * relative to the root of the monorepo.
	 */
	relativePath?: string
}
/**
 * A helper to populate the content array for the tailwind config
 */
export const getContent = ({ relativePath }: ContentHandler) => {
	const basePath = relativePath ? `../../${relativePath}` : __dirname
	return [
		'../../packages/browser/src/**/*.{js,ts,jsx,tsx,html}',
		'../../packages/*/src/**/*.{js,ts,jsx,tsx,html}',
		path.join(basePath, './src/**/*.(js|jsx|ts|tsx)'),
	]
}
