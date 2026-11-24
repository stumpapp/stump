import * as Sentry from '@sentry/react-native'
import { Api } from '@stump/sdk'

import ReadingNowWidget from '~/widgets/ReadingNowWidget.android'

import {
	generateReadingNowSnapshot,
	getSnapshotFromCache,
	RefreshReadingNowWidgetParams,
	ServerBookInput,
} from './shared'

export async function refreshReadingNowWidget(
	serverBooks: ServerBookInput[],
	api: Api | null,
	params: RefreshReadingNowWidgetParams,
): Promise<void> {
	const snapshot = await generateReadingNowSnapshot(serverBooks, api, params)

	console.log('refreshed', snapshot)

	try {
		ReadingNowWidget.updateSnapshot(snapshot)
	} catch (err) {
		Sentry.captureException(err, {
			extra: {
				snapshot,
				serverBooks,
			},
		})
	}
}

export function refreshWidgetFromCache(): void {
	const snapshot = getSnapshotFromCache()
	console.log('from cache', { snapshot })
	if (snapshot) {
		ReadingNowWidget.updateSnapshot(snapshot)
	}
}
