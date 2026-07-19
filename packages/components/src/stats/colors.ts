export type StatColorPalette = { primary: string; secondary: string }

// yoinked the general shape from expo, but less time given for color science consideration etc
export const STAT_COLORS = {
	inProgress: { primary: '#f59e0b', secondary: '#fef3c7' },
	completed: { primary: '#10b981', secondary: '#d1fae5' },
	books: { primary: '#3b82f6', secondary: '#dbeafe' },
	series: { primary: '#a855f7', secondary: '#f3e8ff' },
	readingTime: { primary: '#f43f5e', secondary: '#ffe4e6' },
	size: { primary: '#64748b', secondary: '#f1f5f9' },
} satisfies Record<string, StatColorPalette>
