import stumpPreset, { getContent } from '@stump/components/tailwind'
import type { Config } from 'tailwindcss'

export default {
	content: getContent({ relativePath: 'packages/browser' }),
	presets: [stumpPreset],
} satisfies Config
