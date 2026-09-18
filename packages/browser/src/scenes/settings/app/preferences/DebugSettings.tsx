import { NewCard, RawSwitch } from '@stump/components'

import { useDebugStore } from '@/stores'

const IS_DEVELOPMENT = import.meta.env.DEV

export default function Container() {
	if (!IS_DEVELOPMENT) return null

	return <DebugSettings />
}

// TODO(localization): do it
function DebugSettings() {
	const store = useDebugStore()

	return (
		<NewCard
			tone="debug"
			label="Debug settings"
			description="These won't exist in production, but are useful for debugging"
		>
			<NewCard.Row
				label="Query Tools"
				description="Enable debugging tools for queries"
				onClick={() => store.patch({ showQueryTools: !store.showQueryTools })}
			>
				<RawSwitch
					id="showQueryTools"
					className="data-[state=checked]:bg-debug/70 data-[state=unchecked]:bg-debug/30"
					checked={store.showQueryTools}
					onCheckedChange={(checked) => store.patch({ showQueryTools: checked })}
				/>
			</NewCard.Row>
		</NewCard>
	)
}
