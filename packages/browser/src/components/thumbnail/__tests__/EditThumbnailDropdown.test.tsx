import '@/__mocks__/pointerCapture'
import '@/__mocks__/resizeObserver'

import { useUploadConfig } from '@stump/client'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import EditThumbnailDropdown from '../EditThumbnailDropdown'

vi.mock('@stump/client', () => ({ useUploadConfig: vi.fn() }))
vi.mock('@stump/i18n', () => ({
	useCreateTranslate: () => ({ t: (s: string) => s, translate: (s: string) => s }),
}))
vi.mock('@/context', () => ({ useAppContext: () => ({ checkPermission: () => true }) }))

describe('EditThumbnailDropdown', () => {
	it.each([true, false])('shows upload only when uploads are enabled (%s)', async (enabled) => {
		vi.mocked(useUploadConfig).mockReturnValue({
			uploadConfig: { enabled, maxFileUploadSize: 1024 },
		} as ReturnType<typeof useUploadConfig>)

		render(<EditThumbnailDropdown onChooseSelector={vi.fn()} onUploadImage={vi.fn()} />)
		await userEvent.setup().click(screen.getByRole('button', { name: 'thumbnailDropdown.label' }))

		expect(await screen.findByText('thumbnailDropdown.options.selectFromBooks')).toBeInTheDocument()
		expect(!!screen.queryByText('thumbnailDropdown.options.uploadImage')).toBe(enabled)
	})
})
