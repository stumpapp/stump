// TODO: move to sm like /widgetSync/useContinueReadingWidgetSync.{ios.ts,ts}

import { useSDK } from '@stump/client'
import { useEffect } from 'react'

import { useActiveServer } from '~/components/activeServer/context'
import { refreshWidgetData, type ServerBookInput } from '~/lib/widgetSync'
import { usePreferencesStore } from '~/stores'

import { usePalette } from '../constants'

// intentionally in the shape of server books
export type WidgetSyncBook = {
	id: string
	resolvedName: string
	thumbnail: { url: string }
	readProgress?: { percentageCompleted?: string | null; updatedAt?: string | null } | null
}

export function useWidgetSync(books: WidgetSyncBook[]) {
	const { activeServer } = useActiveServer()
	const { sdk } = useSDK()

	const thumbnailRatio = usePreferencesStore((state) => state.thumbnailRatio)
	const accentColor = usePalette('accent')

	useEffect(() => {
		if (!books.length) return

		const inputs = books.map(
			(book) =>
				({
					id: book.id,
					serverId: activeServer.id,
					name: book.resolvedName,
					thumbnailUrl: book.thumbnail.url,
					percentageCompleted: book.readProgress?.percentageCompleted ?? null,
					updatedAt: book.readProgress?.updatedAt ?? null,
				}) satisfies ServerBookInput,
		)

		refreshWidgetData(inputs, sdk, { thumbnailRatio, accentColor })
	}, [books, activeServer.id, sdk, thumbnailRatio, accentColor])
}
