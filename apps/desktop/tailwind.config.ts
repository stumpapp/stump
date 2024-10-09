import stumpPreset, { getContent } from '@stump/components/tailwind'
import type { Config } from 'tailwindcss'

export default {
	content: getContent({ relativePath: 'packages/desktop' }),
	presets: [stumpPreset],
} satisfies Config
