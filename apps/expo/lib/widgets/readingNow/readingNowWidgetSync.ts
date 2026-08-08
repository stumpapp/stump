import type { Api } from '@stump/sdk'

import { ReadingNowWidgetProps } from '~/widgets/types'

export type ServerBookInput = {
	id: string
	serverId: string
	name: string
	thumbnailUrl: string
	percentageCompleted: string | null
	updatedAt: string | null
	isReadingOffline: boolean
}

type RefreshReadingNowWidgetParams = Pick<
	ReadingNowWidgetProps,
	'thumbnailRatio' | 'accentColor'
> & {
	t: (key: string, options?: Record<string, unknown>) => string
}

// TODO(widgets): rm lint supress, we need this to stub for android until expo-widgets
// supports android widgets

export async function refreshReadingNowWidget(
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	_serverBooks: ServerBookInput[],
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	_api: Api | null,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	_params: RefreshReadingNowWidgetParams,
): Promise<void> {}

export function refreshWidgetFromCache(): void {}
