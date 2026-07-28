import { useSDK } from '@stump/client'
import { useEffect } from 'react'

import { useActiveServer } from '~/components/activeServer/context'
import {
	refreshReadingNowWidget,
	type ServerBookInput,
} from '~/lib/widgets/readingNow/readingNowWidgetSync'
import { usePreferencesStore } from '~/stores'

import { usePalette } from '../../constants'
import { WidgetSyncBook } from './types'

export type { WidgetSyncBook } from './types'

export function useReadingNowWidgetSync(books: WidgetSyncBook[]) {
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

		refreshReadingNowWidget(inputs, sdk, { thumbnailRatio, accentColor })
	}, [books, activeServer.id, sdk, thumbnailRatio, accentColor])
}
