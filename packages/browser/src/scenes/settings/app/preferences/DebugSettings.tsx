import { Label, RawSwitch } from '@stump/components'

import { useDebugStore } from '@/stores'

const IS_DEVELOPMENT = import.meta.env.DEV

export default function Container() {
	if (!IS_DEVELOPMENT) return null

	return <DebugSettings />
}

function DebugSettings() {
	const store = useDebugStore()

	return (
		<div className="gap-4 flex flex-col">
			<div>
				<h3 className="text-base font-medium text-foreground">Debug settings</h3>
				<p className="text-sm text-foreground-muted">
					These won&apos;t exist in production, but are useful for debugging
				</p>
			</div>

			<div className="gap-2 flex flex-col">
				<Label className="rounded-lg p-3 flex items-center justify-between border border-dashed border-fill-brand/40 bg-fill-brand-secondary">
					<div className="gap-1 flex flex-col">
						<span>Query Tools</span>
						<p className="text-sm text-foreground-muted">Enable debugging tools for queries</p>
					</div>
					<RawSwitch
						id="showQueryTools"
						className="data-[state=checked]:bg-fill-brand-secondary/60 data-[state=unchecked]:bg-fill-brand-secondary"
						checked={store.showQueryTools}
						onCheckedChange={(checked) => store.patch({ showQueryTools: checked })}
					/>
				</Label>
			</div>
		</div>
	)
}
