import pluralize from 'pluralize'

/**
 * Creates a simple phrase for a statistic in the correct form, e.g. '1 item' or '2 items'
 *
 * @param word the word to pluralize
 * @param count the number of items (word) to use in the stat
 */
export default function pluralizeStat(word: string, count = 0): string {
	return `${count} ${pluralize(word, count)}`
}
