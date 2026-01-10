export const commonHosts = {
	google: {
		name: 'Google',
		smtpHost: 'smtp.gmail.com',
		smtpPort: 587,
	},
	outlook: {
		name: 'Outlook',
		smtpHost: 'smtp.office365.com',
		smtpPort: 587,
	},
} as Record<string, { name: string; smtpHost: string; smtpPort: number }>

export const getCommonHost = (host: string) =>
	Object.values(commonHosts).find(({ smtpHost }) => smtpHost === host)
