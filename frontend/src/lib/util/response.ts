export async function resolveResponse(res: Response): Promise<any> {
	if (res.status === 401) {
		return {
			status: 302,
			redirect: '/auth/login',
		};
	}

	// TODO: more error handling

	return res.json();
}
