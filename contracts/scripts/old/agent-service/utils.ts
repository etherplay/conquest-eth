export function get(urlpath: string) {
	return request(urlpath, 'GET');
}

export async function request(urlpath: string, method: string, data?: any) {
	const response = await fetch('http://127.0.0.1:8787/' + urlpath, {
		method,
		body: data ? JSON.stringify(data) : undefined,
	});
	if (response.status !== 200) {
		const message = await response.text();
		if (!message) {
			console.log(response.statusText);
		}
		console.error(`ERROR: "${message}"`);
	} else {
		console.log(await response.json());
	}
}
