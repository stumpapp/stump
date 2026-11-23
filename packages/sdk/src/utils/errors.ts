export class ServerCompatibilityError extends Error {
	readonly code = 'SERVER_COMPATIBILITY'

	constructor(message: string) {
		super(message)
		this.name = 'ServerCompatibilityError'
	}
}

export const isServerCompatibilityError = (error: unknown): error is ServerCompatibilityError =>
	error instanceof ServerCompatibilityError
