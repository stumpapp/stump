import {
	isOutdatedGraphQLSchemaError,
	isServerCompatibilityError,
	ServerCompatibilityError,
} from '@stump/sdk'
import { isAxiosError } from 'axios'

export const getServerCompatibilityError = (
	error: unknown,
	translate: (key: string) => string,
): Error | null => {
	if (isServerCompatibilityError(error)) return error
	if (isOutdatedGraphQLSchemaError(error) && error instanceof Error) return error

	if (isAxiosError(error) && error.response?.status === 405) {
		// this can happen if the client is "newer" than the server and is trying to use an endpoint that doesn't exist
		return new ServerCompatibilityError(translate('shared.errors.serverCompatibility.http405'))
	}

	if (error instanceof Error && error.message === 'Malformed response received from server') {
		return new ServerCompatibilityError(
			translate('shared.errors.serverCompatibility.malformedResponse'),
		)
	}

	return null
}
