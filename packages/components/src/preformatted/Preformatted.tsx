import { useMemo } from 'react'

import { Any } from '..'
import { Text } from '../text'

export type PreformattedProps = { title?: string; content: Any }

export function Preformatted({ title, content }: PreformattedProps) {
	const memoContent = useMemo(() => JSON.stringify(content, null, 2), [content])

	const formatted = (
		<div className="rounded-sm p-4 bg-background-surface">
			<pre className="text-xs text-foreground-subtle">{memoContent}</pre>
		</div>
	)

	if (!title) {
		return formatted
	}

	return (
		<div className="pb-0 flex flex-col">
			<div className="h-10 px-4 flex items-center bg-background-surface">
				<Text size="sm" className="font-medium">
					{title}
				</Text>
			</div>
			{formatted}
		</div>
	)
}
