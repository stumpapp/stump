import { ImageColor } from '@stump/graphql'
import { ColorSpace, deltaE2000, getColor, LCH, PlainColorObject, sRGB, to } from 'colorjs.io/fn'

ColorSpace.register(LCH)
ColorSpace.register(sRGB)

type ColorData = {
	color: PlainColorObject
	hex: string
	chroma: number
	percentage: number
}

// These weights are from some trial and error
const W_CHROMA = 5.0
const W_PCT = 0.4
const W_DIFF = 32.0

// The logic is also just made from trial and error
// Scores are mostly in the 0-5 range
const calculateScore = (candidate: ColorData, minDifference: number) => {
	if (candidate.percentage < 0.015) return 0.0
	if (candidate.percentage > 0.34) return 99.9

	// normalise to roughly 0-1 scale (chroma and difference are technically unbounded in LAB)
	const nChroma = candidate.chroma / 128.0
	const nPercentage = candidate.percentage
	const nDifference = minDifference / 128.0

	const chromaPenalty = candidate.chroma < 5.0 ? 0.75 : 1.0
	const visualInterest = chromaPenalty * Math.max(nChroma, nPercentage)

	const score =
		W_CHROMA * Math.pow(nChroma, 2) +
		W_PCT * Math.sqrt(nPercentage) +
		W_DIFF * nDifference * visualInterest

	return score
}

export function selectMeshColors(colorPalette: ImageColor[]): string[] | null {
	if (colorPalette.length < 3) return null

	const candidates: ColorData[] = colorPalette.map((colorData) => {
		const color = getColor(colorData.color)
		const lch = to(color, LCH)
		return {
			color: lch,
			hex: colorData.color,
			chroma: lch.coords[1],
			percentage: colorData.percentage,
		}
	})

	// This is an initial seed colour score that only evaluates chroma and percentage
	candidates.sort((a, b) => {
		const scoreA = a.chroma * Math.sqrt(a.percentage)
		const scoreB = b.chroma * Math.sqrt(b.percentage)
		return scoreB - scoreA
	})

	const firstCandidate = candidates[0]
	if (!firstCandidate) return null

	const finalPalette: ColorData[] = [firstCandidate]
	candidates.splice(0, 1)

	while (finalPalette.length < 3) {
		let bestScore = -Infinity
		let bestCandidateIndex = -1

		candidates.forEach((candidateData, index) => {
			let minDiff = Infinity
			for (const colorData of finalPalette) {
				const diff = deltaE2000(colorData.color, candidateData.color)
				if (diff < minDiff) {
					minDiff = diff
				}
			}

			const score = calculateScore(candidateData, minDiff)

			if (score > bestScore) {
				bestScore = score
				bestCandidateIndex = index
			}
		})

		const bestCandidate = candidates[bestCandidateIndex]
		if (bestCandidateIndex !== -1 && bestCandidate) {
			finalPalette.push(bestCandidate)
			candidates.splice(bestCandidateIndex, 1)
		} else {
			return null
		}
	}

	// Could also try sorting by lightness, chroma, hue, etc.
	finalPalette.sort((a, b) => b.percentage - a.percentage)

	return finalPalette.map((colorData) => colorData.hex)
}
