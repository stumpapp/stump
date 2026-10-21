import { ButtonOrLink, Heading, Text } from '@stump/components'
import { ExternalLink } from 'lucide-react'

import { useTranslate } from '@/hooks/useTranslate'

type Props = {
	localeBase: string
	subtitleLink?: string
}

// TODO(ui): im tired of this pattern i think, how exhausting to care about ui. the big headers
// just don't feel quite right, but for now i made this align with other screens + the bottom
// border for separation. part of my thing is that it kinda just feels like a big empty
// blob of space, which i guess is the point, but also there is a layer of inconsistency
// from the years of slightly changing preferences without cleanup in web that emphasizes
// small things that annoy me like this. i know ~1 month ago i wrote similar-ish thoughts
// for the desktop app title bar, mostly that the current layout doesn't lend itself
// to what i want for it (seamless grab bar that doens't LOOK like a title bar). i think
// maybe next, when i rip out the top bar support, i will look at some shared PageHeader or sm
// to try to steer the ship better. i know shad has a cookie cutter sidebar layout i can prob
// take

export function SteppedFormSceneHeader({ localeBase, subtitleLink }: Props) {
	const { t, translate } = useTranslate()

	// TODO(ui): big button for docs kinda ugly, an info icon might be prettier but less
	// immediately clear
	return (
		<header className="p-4 lg:flex-row lg:items-center gap-3 flex w-full flex-col justify-between border-b border-b-border">
			<div className="flex flex-col">
				<Heading size="lg" bold>
					{t(`${localeBase}.heading`)}
				</Heading>

				<Text size="sm" variant="muted" className="mt-1.5">
					{t(`${localeBase}.subtitle`)}
				</Text>
			</div>

			{subtitleLink && (
				<div>
					<ButtonOrLink href={subtitleLink} variant="outline">
						{translate('shared.common.documentation')}{' '}
						<ExternalLink className="ml-1 h-4 w-4 text-muted-foreground" />
					</ButtonOrLink>
				</div>
			)}
		</header>
	)
}
