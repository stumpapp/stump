import { OPDSMetadata } from '@stump/sdk'
import dayjs from 'dayjs'
import get from 'lodash/get'

export const getNumberField = (meta: OPDSMetadata, key: string) => {
	const value = get(meta, key)
	return typeof value === 'number' ? value : null
}

// const getStringField = (meta: OPDSMetadata, key: string) => {
// 	const value = get(meta, key)
// 	return typeof value === 'string' ? value : null
// }

export const getDateField = (meta: OPDSMetadata, key: string) => {
	const value = get(meta, key)
	const _dayjs = dayjs(typeof value === 'string' ? value : null)
	return _dayjs.isValid() ? _dayjs : null
}
