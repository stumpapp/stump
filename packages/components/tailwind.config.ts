import type { Config } from 'tailwindcss'

import stumpPreset, { getContent } from './tailwind'

export default {
	content: getContent({ relativePath: 'packages/components' }),
	presets: [stumpPreset],
} satisfies Config
