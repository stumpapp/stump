export * from './graphql'
export * from './opds'
export * from './type-guards'
import { SupportedFont } from '@stump/graphql'
import { z } from 'zod'

import { AuthUser } from './graphql'

export const isUser = (data: unknown): data is AuthUser => {
	const casted = data as AuthUser
	return casted?.id !== undefined && casted?.isServerOwner !== undefined
}

const fontSchema = z.nativeEnum(SupportedFont)
export const isSupportedFont = (data: unknown): data is SupportedFont => {
	return fontSchema.safeParse(data).success
}

export type APIError =
	| { code: 'BadRequest'; details: string }
	| { code: 'NotFound'; details: string }
	| { code: 'InternalServerError'; details: string }
	| { code: 'Unauthorized'; details: string }
	| { code: 'Forbidden'; details: string }
	| { code: 'NotImplemented'; details: string }
	| { code: 'ServiceUnavailable'; details: string }
	| { code: 'BadGateway'; details: string }
	| { code: 'Unknown'; details: string }
	| { code: 'Redirect'; details: string }

export type UpdateCheck = {
	currentSemver: string
	latestSemver: string
	hasUpdateAvailable: boolean
}

export type StumpVersion = {
	semver: string
	rev: string
	compileTime: string
	buildChannel: string | null
}

export type ColumnSort = {
	id: string
	position: number
}

export type ColumnOrder = {
	id: string
	desc: boolean
}
