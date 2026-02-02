import qrcode from 'qrcode';
const args = process.argv.slice(2);
const url = args[0];
(async () => {
	const qrURL = await qrcode.toDataURL(url);
	console.log(qrURL);
})();
