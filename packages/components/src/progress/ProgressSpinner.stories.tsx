import { Meta, StoryObj } from '@storybook/react'

import { ProgressSpinner } from './ProgressSpinner'

const StoryMeta: Meta<typeof ProgressSpinner> = {
	component: ProgressSpinner,
	title: 'progress/ProgressSpinner',
}

export const Default: StoryObj<typeof ProgressSpinner> = {
	render: () => <ProgressSpinner />,
}

export const Primary: StoryObj<typeof ProgressSpinner> = {
	render: () => <ProgressSpinner variant="primary" />,
}

export const Small: StoryObj<typeof ProgressSpinner> = {
	render: () => <ProgressSpinner size="sm" />,
}

export default StoryMeta
