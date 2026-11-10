import { Text } from '@stump/components'
import { CircleSlash2 } from 'lucide-react'

// TODO(owl): mini empty owl?
// TODO: locale

export function CardListEmptyState() {
	return (
		<div className="flex">
			<div className="space-x-3 px-4 py-4 flex items-start justify-start rounded-lg border border-dashed border-border">
				<span className="p-2 rounded-lg border border-border bg-muted">
					<CircleSlash2 className="h-8 w-8 text-muted-foreground" />
				</span>
				<div>
					<Text>Nothing to show</Text>
					<Text size="sm" variant="muted">
						No results were returned
					</Text>
				</div>
			</div>
		</div>
	)
}
