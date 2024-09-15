import { SavedServer } from '@stump/types'
import { fireEvent, render, screen } from '@testing-library/react'

import ConfiguredServer from '../ConfiguredServer'

jest.mock('@stump/i18n', () => ({
	useLocaleContext: jest.fn().mockReturnValue({
		t: jest.fn().mockImplementation((key: string) => key),
	}),
}))

const onEdit = jest.fn()
const onDelete = jest.fn()
const onSwitch = jest.fn()

type SubjectProps = {
	server?: Partial<SavedServer>
	isActive?: boolean
	isReachable?: boolean
}
const Subject = ({ server, isActive, isReachable }: SubjectProps) => (
	<ConfiguredServer
		server={{
			name: 'Test Server',
			uri: 'http://localhost:10801',
			...server,
		}}
		isActive={isActive ?? false}
		isReachable={isReachable}
		onEdit={onEdit}
		onDelete={onDelete}
		onSwitch={onSwitch}
	/>
)

describe('ConfiguredServer', () => {
	it('should render properly', () => {
		expect(render(<Subject />).container).not.toBeEmptyDOMElement()
	})

	it('should render a badge for the active server', () => {
		render(<Subject isActive />)

		expect(screen.getByTestId('activeBadge')).toBeInTheDocument()
	})

	it('should render a badge for the unreachable server', () => {
		render(<Subject isReachable={false} />)

		expect(screen.getByTestId('unreachableBadge')).toBeInTheDocument()
	})

	describe('callbacks', () => {
		beforeEach(() => {
			jest.clearAllMocks()
		})

		it('should call onEdit when the edit button is clicked', () => {
			render(<Subject />)
			fireEvent.click(screen.getByTestId('editButton'))
			expect(onEdit).toHaveBeenCalled()
		})

		it('should call onDelete when the delete button is clicked', () => {
			render(<Subject />)
			fireEvent.click(screen.getByTestId('deleteButton'))
			expect(onDelete).toHaveBeenCalled()
		})

		it('should call onSwitch when the switch button is clicked', () => {
			render(<Subject />)
			fireEvent.click(screen.getByTestId('switchButton'))
			expect(onSwitch).toHaveBeenCalled()
		})
	})
})
