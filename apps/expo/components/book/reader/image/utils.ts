type InvertReadingDirectionParams = {
	direction: 'ltr' | 'rtl'
	page: number
	totalPages: number
}

export const invertReadingDirection = ({
	direction,
	page,
	totalPages,
}: InvertReadingDirectionParams): Omit<InvertReadingDirectionParams, 'totalPages'> => ({
	direction: direction === 'ltr' ? 'rtl' : 'ltr',
	page: direction === 'ltr' ? totalPages - page + 1 : page,
})
