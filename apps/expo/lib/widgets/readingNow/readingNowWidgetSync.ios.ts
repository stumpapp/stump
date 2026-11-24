import * as Sentry from '@sentry/react-native'
import { Api } from '@stump/sdk'

import ReadingNowWidget from '~/widgets/ReadingNowWidget.ios'

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
	if (snapshot) {
		ReadingNowWidget.updateSnapshot(snapshot)
	}
}
