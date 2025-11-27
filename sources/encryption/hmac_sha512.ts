import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { sha512 } from 'js-sha512';

// Check if crypto.subtle is available (requires secure context on web)
function isSubtleAvailable(): boolean {
    if (Platform.OS !== 'web') return true;
    return typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined';
}

// Pure JS SHA-512 digest fallback for insecure contexts
function sha512Digest(data: Uint8Array): Uint8Array {
    const hash = sha512.arrayBuffer(data);
    return new Uint8Array(hash);
}

export async function hmac_sha512(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
    const blockSize = 128; // SHA512 block size in bytes
    const opad = 0x5c;
    const ipad = 0x36;

    const useSubtle = isSubtleAvailable();

    // Helper function to compute SHA-512
    const digest = async (input: Uint8Array): Promise<Uint8Array> => {
        if (useSubtle) {
            // Create a copy with a fresh ArrayBuffer to satisfy TypeScript
            const buffer = new ArrayBuffer(input.length);
            const view = new Uint8Array(buffer);
            view.set(input);
            const hash = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA512, view);
            return new Uint8Array(hash);
        } else {
            return sha512Digest(input);
        }
    };

    // Prepare key
    let actualKey = key;
    if (key.length > blockSize) {
        // If key is longer than block size, hash it
        actualKey = await digest(key);
    }

    // Pad key to block size
    const paddedKey = new Uint8Array(blockSize);
    paddedKey.set(actualKey);

    // Create inner and outer padded keys
    const innerKey = new Uint8Array(blockSize);
    const outerKey = new Uint8Array(blockSize);

    for (let i = 0; i < blockSize; i++) {
        innerKey[i] = paddedKey[i] ^ ipad;
        outerKey[i] = paddedKey[i] ^ opad;
    }

    // Inner hash: SHA512(innerKey || data)
    const innerData = new Uint8Array(blockSize + data.length);
    innerData.set(innerKey);
    innerData.set(data, blockSize);
    const innerHash = await digest(innerData);

    // Outer hash: SHA512(outerKey || innerHash)
    const outerData = new Uint8Array(blockSize + 64); // 64 bytes for SHA512 hash
    outerData.set(outerKey);
    outerData.set(innerHash, blockSize);
    const finalHash = await digest(outerData);

    return finalHash;
}