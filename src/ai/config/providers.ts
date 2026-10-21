/**
 * LLM provider configuration for the reporter's AI features.
 * Keys come from the environment (.env), a run without one simply skips them.
 */
const API_KEY_VARS = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY'];

export function hasApiKey(): boolean {
    return API_KEY_VARS.some((name) => Boolean(process.env[name]));
}
