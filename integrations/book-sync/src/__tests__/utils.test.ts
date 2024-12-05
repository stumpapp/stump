import { describe, expect, test } from 'vitest'

import { getRemotePath } from '../utils'

describe('utils', () => {
	describe('getRemotePath', () => {
		test('should properly normalize a unix path', () => {
			const result = getRemotePath('/Users/oromei/Documents/Comics/Marvel/Spider-Man/Issue1.cbz', {
				host: '/Users/oromei/Documents/Comics',
				remote: '/data/comics',
			})
			expect(result).toBe('/data/comics/Marvel/Spider-Man/Issue1.cbz')
		})

		test('should properly normalize a windows path for a posix remote', () => {
			const result = getRemotePath(
				'C:\\Users\\oromei\\Documents\\Comics\\Marvel\\Spider-Man\\Issue1.cbz',
				{
					host: 'C:\\Users\\oromei\\Documents\\Comics',
					remote: '/data/comics',
				},
			)
			expect(result).toBe('/data/comics/Marvel/Spider-Man/Issue1.cbz')
		})

		test('should properly normalize a windows path for a windows remote', () => {
			const result = getRemotePath(
				'C:\\Users\\oromei\\Documents\\Comics\\Marvel\\Spider-Man\\Issue1.cbz',
				{
					host: 'C:\\Users\\oromei\\Documents\\Comics',
					remote: 'Z:\\data\\comics',
				},
				{
					outputUnix: false,
				},
			)
			expect(result).toBe('Z:\\data\\comics\\Marvel\\Spider-Man\\Issue1.cbz')
		})
	})
})
