// 14-11-2026

/**
 * Agent factory — a new agent is a prompt plus an output schema, nothing else.
 *
 *   const rca = createAgent<RcaVerdict>({ prompt: 'rca.prompt.md', schema: 'rca.schema.json' });
 *   const verdict = await rca({ TITLE: test.title, ERROR: error.message });
 *
 * Both files live in `src/ai/prompts/`:
 *   - `*.prompt.md`    the instruction, with {{PLACEHOLDER}} slots the caller fills
 *   - `*.schema.json`  the JSON shape the reply must have
 *
 * The reply is validated against the schema before it is returned, so a model that
 * invents fields or drops a required one fails here with a readable message
 * instead of confusing whatever consumes the result.
 *
 * Files are read on every call rather than at import, so editing a prompt takes
 * effect on the next run and a missing file cannot break the reporter at startup.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { generateJson } from '../LLMGateway';

const PROMPTS_DIR = resolve(__dirname, '../prompts');
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

export interface AgentSpec {
    /** Prompt file inside src/ai/prompts, e.g. 'rca.prompt.md'. */
    prompt: string;
    /** Schema file inside src/ai/prompts, e.g. 'rca.schema.json'. */
    schema: string;
}

export type Agent<Args extends Record<string, string>, T> = (args: Args) => Promise<T>;

export function createAgent<T>(spec: AgentSpec): Agent<Record<string, string>, T> {
    return async function run(args: Record<string, string>): Promise<T> {
        const template = readFileSync(resolve(PROMPTS_DIR, spec.prompt), 'utf8');
        const validate = ajv.compile(JSON.parse(readFileSync(resolve(PROMPTS_DIR, spec.schema), 'utf8')));

        // Unknown {{SLOTS}} become empty strings rather than leaking into the prompt.
        const prompt = template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => args[key] ?? '');

        const data = await generateJson<T>(prompt);

        if (!validate(data)) {
            throw new Error(
                `[${spec.prompt}] the model's reply did not match ${spec.schema}: ${ajv.errorsText(validate.errors)}`,
            );
        }
        return data;
    };
}
