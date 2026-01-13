import axios from 'axios';
import { decodeBase64, encodeBase64 } from '../encryption/base64';
import { getServerUrl } from '@/sync/serverConfig';
import { QRAuthKeyPair } from './authQRStart';
import { decryptBox } from '@/encryption/libsodium';

export interface AuthCredentials {
    secret: Uint8Array;
    token: string;
}

export async function authQRWait(keypair: QRAuthKeyPair, onProgress?: (dots: number) => void, shouldCancel?: () => boolean): Promise<AuthCredentials | null> {
    let dots = 0;
    const serverUrl = getServerUrl();

    while (true) {
        if (shouldCancel && shouldCancel()) {
            return null;
        }

        try {
            const response = await axios.post(`${serverUrl}/v1/auth/account/request`, {
                publicKey: encodeBase64(keypair.publicKey),
            });

            if (response.data.state === 'authorized') {
                const token = response.data.token as string;
                const encryptedResponse = decodeBase64(response.data.response);
                
                const decrypted = decryptBox(encryptedResponse, keypair.secretKey);
                if (decrypted) {
                    console.log('\n\n✓ Authentication successful\n');
                    // Check version byte and extract dataKeySeed
                    // Version 0: response contains [version(1 byte) + dataKeySeed(32 bytes)]
                    // Legacy: response is the secret directly
                    if (decrypted[0] === 0 && decrypted.length >= 33) {
                        const dataKeySeed = decrypted.slice(1, 33);
                        console.log('[auth] Extracted dataKeySeed (32 bytes) from version 0 response');
                        return {
                            secret: dataKeySeed,
                            token: token
                        };
                    } else {
                        // Legacy format - use entire decrypted blob
                        console.log('[auth] Using legacy format (using entire decrypted blob as secret)');
                        return {
                            secret: decrypted,
                            token: token
                        };
                    }
                } else {
                    console.log('\n\nFailed to decrypt response. Please try again.');
                    return null;
                }
            }
        } catch (error) {
            console.log('\n\nFailed to check authentication status. Please try again.');
            return null;
        }

        // Call progress callback if provided
        if (onProgress) {
            onProgress(dots);
        }
        dots++;

        // Wait 1 second before next check
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}