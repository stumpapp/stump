import { Api } from '@stump/sdk'

// TODO: i added instances here because it does make sense to not collect instances for each type of sync
// needlessly, can just collect up front then pass them down to each sync function, but mostly because
// the collection fn reports skipped servers and so we would get multiple skipped server toasts. i think
// a better iteration down the line would be that each sync fn returns information about skipped servers,
// and so the reporting can be done in a more appropriate location
// this is fine for now tho
export type PushSyncParams = {
	forServers?: string[]
	ignoreBookIds?: string[]
	instances?: Record<string, Api>
}

export type SyncParams = Omit<PushSyncParams, 'ignoreBookIds'>
