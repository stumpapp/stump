import { useMemo } from 'react'

import { Any } from '..'
import { Text } from '../text'

export type PreformattedProps = { title?: string; content: Any }

export function Preformatted({ title, content }: PreformattedProps) {
	const memoContent = useMemo(() => JSON.stringify(content, null, 2), [content])

	const formatted = (
		<div className="rounded-sm bg-background-surface p-4">
			<pre className="text-xs text-foreground-subtle">{memoContent}</pre>
		</div>
	)

	if (!title) {
		return formatted
	}

	return (
		<div className="flex flex-col pb-0">
			<div className="flex h-10 items-center bg-background-surface px-4">
				<Text size="sm" className="font-medium">
					{title}
				</Text>
			</div>
			{formatted}
		</div>
	)
}
