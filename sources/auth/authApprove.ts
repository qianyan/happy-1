
import axios from 'axios';
import { encodeBase64 } from "../encryption/base64";
import { getServerUrl } from "@/sync/serverConfig";

interface AuthRequestStatus {
    status: 'not_found' | 'pending' | 'authorized';
    supportsV2: boolean;
}

/**
 * Approve a terminal authentication request
 *
 * @param token - The user's auth token
 * @param publicKey - The terminal's ephemeral public key
 * @param answerV1 - The V1 encrypted response
 * @param answerV2 - The V2 encrypted response
 * @param serverUrlOverride - Optional server URL override for self-hosted setups
 */
export async function authApprove(token: string, publicKey: Uint8Array, answerV1: Uint8Array, answerV2: Uint8Array, serverUrlOverride?: string) {
    // Use override URL if provided (for self-hosted setups), otherwise use configured server
    const API_ENDPOINT = serverUrlOverride || getServerUrl();
    const publicKeyBase64 = encodeBase64(publicKey);
    
    // First, check the auth request status
    const statusResponse = await axios.get<AuthRequestStatus>(
        `${API_ENDPOINT}/v1/auth/request/status`,
        {
            params: {
                publicKey: publicKeyBase64
            }
        }
    );
    
    const { status, supportsV2 } = statusResponse.data;
    
    // Handle different status cases
    if (status === 'not_found') {
        // Already authorized, no need to approve again
        console.log('Auth request already authorized or not found');
        return;
    }
    
    if (status === 'authorized') {
        // Already authorized, no need to approve again
        console.log('Auth request already authorized');
        return;
    }
    
    // Handle pending status
    if (status === 'pending') {
        await axios.post(`${API_ENDPOINT}/v1/auth/response`, {
            publicKey: publicKeyBase64,
            response: supportsV2 ? encodeBase64(answerV2) : encodeBase64(answerV1)
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
            }
        });
    }
}