import {
	createThirdwebClient,
	defineChain,
	simulateTransaction,
} from "thirdweb";
import { sendAndConfirmTransaction } from "thirdweb/transaction";
import { privateKeyToAccount } from "thirdweb/wallets";
import {
	createEd25519Keypair,
	getRegistrationPrice,
	getUsdRegistrationPrice,
	registerFid,
	registerFidAndSigner,
	addSigner,
	addSignerFor,
	getAddData,
	getNonce,
	getKeyRequestData,
	rentStorage,
	encodeSignedKeyRequestMetadata,
} from "thirdweb/extensions/farcaster";

const ANVIL_PRIVATE_KEY_A =
	"0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as const;
const ANVIL_PRIVATE_KEY_B =
	"0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" as const;
const RECOVERY_ADDRESS = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as const;

async function main() {
	const client = createThirdwebClient({
		secretKey: "TEST",
	});

	const anvil = defineChain({
		id: 10,
		name: "Anvil",
		rpc: "http://localhost:8545",
	});

	const price = await getRegistrationPrice({ client, chain: anvil });
	console.log("Price to register in wei:", price);

	const usdPrice = await getUsdRegistrationPrice({ client, chain: anvil });
	console.log("Price to register in USD:", usdPrice);

	const appAccount = privateKeyToAccount({
		client,
		privateKey: ANVIL_PRIVATE_KEY_A,
	});

	const _registerFid = registerFid({
		client,
		chain: anvil,
		recoveryAddress: RECOVERY_ADDRESS,
	});

	const [appFid, _overpaid] = await simulateTransaction({
		transaction: _registerFid,
		account: appAccount,
	});

	const registerFidResult = await sendAndConfirmTransaction({
		transaction: _registerFid,
		account: appAccount,
	});

	console.log("Successfully ran registerFid | FID:", appFid);

	const signer = await createEd25519Keypair();

	const userAccount = privateKeyToAccount({
		client,
		privateKey: ANVIL_PRIVATE_KEY_B,
	});

	const _registerFidAndSigner = registerFidAndSigner({
		client,
		chain: anvil,
		recoveryAddress: RECOVERY_ADDRESS,
		appAccount,
		userAccount,
		signerPublicKey: signer.publicKey,
	});

	const userFid = await simulateTransaction({
		transaction: _registerFidAndSigner,
		account: appAccount,
	});
	const registerFidAndSignerResult = await sendAndConfirmTransaction({
		transaction: _registerFidAndSigner,
		account: appAccount,
	});
	console.log("Successfully ran registerFidAndSigner | User FID:", userFid);

	const newSigner = await createEd25519Keypair();
	const _addSigner = addSigner({
		client,
		chain: anvil,
		appAccount,
		signerPublicKey: newSigner.publicKey,
	});
	const addSignerResult = await sendAndConfirmTransaction({
		transaction: _addSigner,
		account: appAccount,
	});
	console.log("Successfully ran addSigner");

	const anotherNewSigner = await createEd25519Keypair();
	const _addSignerFor = addSignerFor({
		client,
		chain: anvil,
		appAccount,
		userAccount,
		signerPublicKey: anotherNewSigner.publicKey,
	});
	const addSignerForResult = await sendAndConfirmTransaction({
		transaction: _addSignerFor,
		account: appAccount,
	});
	console.log("Successfully ran addSignerFor");

	// Test externally generated signature usage //
	const deadline = Date.now() + 1000 * 60 * 60 * 24;
	const aWildSignerAppeared = await createEd25519Keypair();
	const signedKeyRequestData = getKeyRequestData({
		requestFid: appFid,
		key: aWildSignerAppeared.publicKey,
		deadline: BigInt(deadline),
	});
	const keyRequestSignature = await appAccount.signTypedData(
		signedKeyRequestData
	);
	const signedKeyRequestMetadata = encodeSignedKeyRequestMetadata({
		keyRequestSignature,
		requestSigner: appAccount.address,
		requestFid: appFid,
		deadline: BigInt(deadline),
	});

	const nonce = await getNonce({
		client,
		address: userAccount.address,
	});
	const addData = getAddData({
		owner: userAccount.address,
		keyType: 1,
		key: aWildSignerAppeared.publicKey,
		metadataType: 1,
		metadata: signedKeyRequestMetadata,
		nonce,
		deadline: BigInt(deadline),
	});
	const addSignature = await userAccount.signTypedData(addData);

	const _addSignerForExternal = addSignerFor({
		client,
		chain: anvil,
		signerPublicKey: aWildSignerAppeared.publicKey,
		addSignature,
		userAddress: userAccount.address,
		signedKeyRequestMetadata,
		appAccountAddress: appAccount.address,
		deadline: BigInt(deadline),
	});
	const addSignerForExternalResult = await sendAndConfirmTransaction({
		transaction: _addSignerForExternal,
		account: appAccount,
	});
	console.log("Successfully ran addSignerFor using external signatures");

	const _rentStorage = await rentStorage({
		client,
		chain: anvil,
		fid: userFid,
	});
	const rentStorageResult = await sendAndConfirmTransaction({
		transaction: _rentStorage,
		account: appAccount,
	});
	console.log("Successfully ran rentStorage");
}

main();
