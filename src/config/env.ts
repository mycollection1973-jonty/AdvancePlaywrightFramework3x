// 27-10-2026

/**
 * env — tiny accessor for values coming from `.env`.
 *
 * `playwright.config.ts` already loads `.env` via dotenv before anything else
 * runs, so this just reads `process.env` and falls back when a key is missing
 * or left blank.
 */

export function envOr(key: string, fallback: string): string {
    const value = process.env[key];
    return value && value.trim() !== '' ? value.trim() : fallback;
}
