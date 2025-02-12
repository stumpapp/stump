import { OPDSMetadata } from '@stump/sdk'
import dayjs from 'dayjs'
import get from 'lodash/get'
import { stringMd5 } from 'react-native-quick-md5'

export const getNumberField = (meta: OPDSMetadata, key: string) => {
	const value = get(meta, key)
	return typeof value === 'number' ? value : null
}

export const getStringField = (meta: OPDSMetadata, key: string) => {
	const value = get(meta, key)
	return typeof value === 'string' ? value : null
}

export const getDateField = (meta: OPDSMetadata, key: string) => {
	const value = get(meta, key)
	const _dayjs = dayjs(typeof value === 'string' ? value : null)
	return _dayjs.isValid() ? _dayjs : null
}

// An identifier that can be generated from a URL to uniquely identify a publication
// without dealing with common URL issues for file names
export const hashFromURL = (url: string) => stringMd5(url)
