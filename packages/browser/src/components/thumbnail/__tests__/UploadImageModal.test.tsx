import '@/__mocks__/resizeObserver'

import { LocaleProvider } from '@stump/i18n'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { toast } from 'sonner'

import UploadImageModal from '../UploadImageModal'

vi.mock('sonner', () => ({
	toast: { error: vi.fn() },
}))

describe('UploadImageModal', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('shows the localized error when a dropped image exceeds the maximum size', async () => {
		render(
			<LocaleProvider locale="en-US">
				<UploadImageModal isOpen onClose={vi.fn()} onUploadImage={vi.fn()} />
			</LocaleProvider>,
		)

		const dropTarget = screen.getByText('Drop image here or click to select').parentElement
		if (!dropTarget) {
			throw new Error('Drop target not found')
		}

		const oversizedFile = new File([new Uint8Array(20 * 1024 * 1024 + 1)], 'oversized.png', {
			type: 'image/png',
		})

		fireEvent.drop(dropTarget, {
			dataTransfer: {
				files: [oversizedFile],
				items: [
					{
						kind: 'file',
						type: 'image/png',
						getAsFile: () => oversizedFile,
					},
				],
				types: ['Files'],
			},
		})

		await waitFor(() => expect(toast.error).toHaveBeenCalledWith('File too large'))
		expect(toast.error).not.toHaveBeenCalledWith(expect.stringContaining('20MB max'))
	})
})
