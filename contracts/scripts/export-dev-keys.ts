import { mnemonicToAccount } from 'viem/accounts';

// The dev mnemonic
const MNEMONIC = 'test test test test test test test test test test test junk';

// Number of accounts to export
const NUM_ACCOUNTS = 20;

console.log('='.repeat(80));
console.log(`Exporting first ${NUM_ACCOUNTS} private keys from dev mnemonic`);
console.log('='.repeat(80));
console.log(`Mnemonic: ${MNEMONIC}`);
console.log('='.repeat(80));
console.log('');

// Standard Ethereum derivation path: m/44'/60'/0'/0/${i}
for (let i = 0; i < NUM_ACCOUNTS; i++) {
	// Create an account from the mnemonic with the given address index
	const account = mnemonicToAccount(MNEMONIC, {
		addressIndex: i,
	});

	// Get the private key from the HDKey
	const hdKey = account.getHdKey();
	if (!hdKey.privateKey) {
		console.log(`Account #${i + 1}`);
		console.log(`  Error: Could not derive private key`);
		console.log('');
		continue;
	}
	
	// Convert private key Buffer to hex string
	const privateKey = `0x${Buffer.from(hdKey.privateKey).toString('hex')}`;

	console.log(`Account #${i + 1}`);
	console.log(`  Address:     ${account.address}`);
	console.log(`  Private Key: ${privateKey}`);
	console.log(`  Path:        m/44'/60'/0'/0/${i}`);
	console.log('');
}

console.log('='.repeat(80));
console.log(`Successfully exported ${NUM_ACCOUNTS} accounts`);
console.log('='.repeat(80));
console.log('');
console.log('WARNING: Never share private keys with anyone!');
console.log('WARNING: Never commit private keys to version control!');