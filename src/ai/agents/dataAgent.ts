// 16-11-2026

/**
 * DataGen agent — invents test data. Prompt and schema live in src/ai/prompts.
 *
 * The prompt carries {{FIRST_INITIAL}}, {{LAST_INITIAL}} and {{STATE}} slots on
 * purpose: sending the same prompt every call makes the model repeat itself, so the
 * caller varies the slots each time (see learnings/2026-11-12-llm-gateway-multi-provider.md).
 */

import { createAgent } from './agentFactory';

export interface CheckoutCustomer {
    firstName: string;
    lastName: string;
    postalCode: string;
}

export const checkoutCustomerAgent = createAgent<CheckoutCustomer>({
    prompt: 'checkoutCustomer.prompt.md',
    schema: 'checkoutCustomer.schema.json',
});
