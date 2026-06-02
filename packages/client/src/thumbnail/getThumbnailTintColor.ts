import { ColorSpace, getColor, OKLCH, serialize, set, sRGB } from 'colorjs.io/fn'

ColorSpace.register(sRGB)
ColorSpace.register(OKLCH)

type Config = {
	dark: boolean
}

export function getThumbnailTintColor(color: string, { dark }: Config): string {
	const plainColor = getColor(color)
	set(plainColor, {
		'oklch.l': (l) => (dark ? 0.35 * Math.pow(l, 0.4) : 0.8 * Math.pow(l, 0.6) + 0.2),
		'oklch.c': (c) => 0.95 * c + 0.05 * 0.4,
	})
	return serialize(plainColor, { format: 'hex' })
}
