export const commonHosts = {
	google: {
		name: 'Google',
		smtp_host: 'smtp.gmail.com',
		smtp_port: 587,
	},
	outlook: {
		name: 'Outlook',
		smtp_host: 'smtp.office365.com',
		smtp_port: 587,
	},
} as Record<string, { name: string; smtp_host: string; smtp_port: number }>

export const getCommonHost = (host: string) =>
	Object.values(commonHosts).find(({ smtp_host }) => smtp_host === host)
