// intentionally in the shape of server books
export type WidgetSyncBook = {
	id: string
	resolvedName: string
	thumbnail: { url: string }
	readProgress?: { percentageCompleted?: string | null; updatedAt?: string | null } | null
}
