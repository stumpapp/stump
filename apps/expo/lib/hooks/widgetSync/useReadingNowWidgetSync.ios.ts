import { useSDKSafe } from '@stump/client'
import { useEffect } from 'react'

import {
	refreshReadingNowWidget,
	type ServerBookInput,
} from '~/lib/widgets/readingNow/readingNowWidgetSync'
import { usePreferencesStore } from '~/stores'

import { usePalette } from '../../constants'
import { WidgetSyncBook } from './types'

export type { WidgetSyncBook } from './types'

export function useReadingNowWidgetSync(books: WidgetSyncBook[]) {
	const sdkContext = useSDKSafe()

	const thumbnailRatio = usePreferencesStore((state) => state.thumbnailRatio)
	const accentColor = usePalette('accent')

	useEffect(() => {
		if (!books.length) return

		const inputs = books.map(
			(book) =>
				({
					id: book.id,
					serverId: book.serverId,
					name: book.resolvedName,
					thumbnailUrl: book.thumbnail.url,
					percentageCompleted: book.readProgress?.percentageCompleted ?? null,
					updatedAt: book.readProgress?.updatedAt ?? null,
					isReadingOffline: book.isReadingOffline ?? false,
				}) satisfies ServerBookInput,
		)

		refreshReadingNowWidget(inputs, sdkContext?.sdk || null, { thumbnailRatio, accentColor })
	}, [books, sdkContext?.sdk, thumbnailRatio, accentColor])
}
