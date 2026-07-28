export type WidgetSyncBook = {
	id: string
	resolvedName: string
	thumbnail: { url: string }
	readProgress?: { percentageCompleted?: string | null; updatedAt?: string | null } | null
}

// TODO(widgets): rm lint supress, we need this to stub for android until expo-widgets
// supports android widgets

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useWidgetSync(_books: WidgetSyncBook[]) {}
