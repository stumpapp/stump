import { OPDSLink } from '@stump/sdk'

/**
 * A function to check if a link is a download link, based on the rel attribute
 *
 * @param link The link to check
 */
export const isDownloadLink = (link: OPDSLink) => link.rel === 'http://opds-spec.org/acquisition'

/**
 * A function to check if a link is a progression link, based on the rel attribute
 *
 * @param link The link to check
 */
export const isProgressionLink = (link: OPDSLink) =>
	link.rel === 'http://www.cantook.com/api/progression'
