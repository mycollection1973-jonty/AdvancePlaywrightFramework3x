/**
 * LLM provider configuration for the reporter's AI features.
 * The provider list lives in the gateway, so both stay in step: this only
 * answers "is any provider configured".
 */
import { availableProviders } from '../LLMGateway';

export function hasApiKey(): boolean {
    return availableProviders().length > 0;
}
