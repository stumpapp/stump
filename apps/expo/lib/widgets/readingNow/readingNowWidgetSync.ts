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

// TODO(widgets): rm lint supress, we need this to stub for android until expo-widgets
// supports android widgets

export async function refreshReadingNowWidget(
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	_serverBooks: ServerBookInput[],
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	_api: Api | null,
	// _t: (key: string, options?: Record<string, unknown> | undefined) => string,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	_params: Pick<ReadingNowWidgetProps, 'thumbnailRatio' | 'accentColor'>,
): Promise<void> {}

export function refreshWidgetFromCache(): void {}
