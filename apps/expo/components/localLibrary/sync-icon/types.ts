import { syncStatus } from '~/db'

export type SyncIconProps = {
	status: (typeof syncStatus.enum)[keyof typeof syncStatus.enum]
	size?: number
}
