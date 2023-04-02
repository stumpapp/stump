// TODO: not sure this is worth TBH.
export const paths = {
	home: () => '/',
	settings: (subpath?: string) => `/settings/${subpath || ''}`,
} as const
