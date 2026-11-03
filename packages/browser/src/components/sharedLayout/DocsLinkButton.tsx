import { ToolTip } from '@stump/components'
import { BookOpenText } from 'lucide-react'

import { useTranslate } from '@/hooks/useTranslate'

type Props = {
	href: string
}

export function DocsLinkButton({ href }: Props) {
	const { translate } = useTranslate()

	return (
		<ToolTip content={translate('shared.common.documentation')} side="left">
			<a
				href={href}
				target="_blank"
				rel="noreferrer"
				aria-label={translate('shared.common.documentation')}
				className="size-7 flex shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
			>
				<BookOpenText className="h-4 w-4" />
			</a>
		</ToolTip>
	)
}
