import { IconButton, ToolTip } from '@stump/components'
import { InterfaceLayout } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { LayoutGrid, Table } from 'lucide-react'

type Props = {
	layout: InterfaceLayout
	setLayout: (layout: InterfaceLayout) => void
}

export default function TableOrGridLayout({ layout, setLayout }: Props) {
	const { t } = useLocaleContext()
	return (
		<div className="gap-1 flex shrink-0 items-center">
			<ToolTip content={t('controlUi.layout.grid')} size="sm">
				<IconButton
					variant="ghost"
					size="sm"
					className="hover:bg-accent"
					onClick={() => setLayout(InterfaceLayout.Grid)}
					disabled={layout === InterfaceLayout.Grid}
				>
					<LayoutGrid className="h-4 w-4" />
				</IconButton>
			</ToolTip>

			<ToolTip content={t('controlUi.layout.table')} size="sm" align="end">
				<IconButton
					variant="ghost"
					size="sm"
					className="hover:bg-accent"
					onClick={() => setLayout(InterfaceLayout.Table)}
					disabled={layout === InterfaceLayout.Table}
				>
					<Table className="h-4 w-4" />
				</IconButton>
			</ToolTip>
		</div>
	)
}
