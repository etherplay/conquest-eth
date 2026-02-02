import fs from 'fs';
import {parse} from 'csv-parse';

const records: string[][] = [];
// Initialize the parser
const parser = parse({
	delimiter: ',',
});
// Use the readable stream api to consume records
parser.on('readable', function () {
	let record;
	while ((record = parser.read()) !== null) {
		records.push(record);
	}
});
// Catch any error
parser.on('error', function (err) {
	console.error(err.message);
	process.exit(1);
});

const emails: string[] = [];
const onlyOneShot: string[] = [];
parser.on('end', function () {
	for (const record of records) {
		if (record[3].trim()) {
			if (record[6] == 'Yes') {
				emails.push(record[3]);
			} else if (record[7] == `Yes, that's fine`) {
				onlyOneShot.push(record[3]);
			}
		}
	}
	console.log(records.length);
	console.log(emails.length);
	console.log(onlyOneShot.length);
	console.log(onlyOneShot.join(', '));

	let emailCSV = 'email,created_at\n';
	for (const email of emails) {
		emailCSV += `${email},2025-02-03T10:00:00.000Z\n`;
	}
	fs.writeFileSync('./new_subscribers.csv', emailCSV);

	let oneshotCSV = 'email,created_at\n';
	for (const email of onlyOneShot) {
		oneshotCSV += `${email},2025-02-03T10:00:00.000Z\n`;
	}
	fs.writeFileSync('./only_once_subscriber.csv', oneshotCSV);
});

const args = process.argv.slice(2);
const content = fs.readFileSync(args[0], 'utf-8');
const lines = content.split('\n');

for (const line of lines.slice(1)) {
	parser.write(`${line}\n`);
}

// Close the readable stream
parser.end();
