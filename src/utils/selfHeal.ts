/**
 * Shape of the `self-heal` attachment that the reporter renders in the
 * "Self-Heal" tab. Nothing produces it yet, so that tab stays empty until a
 * locator-repair step attaches one.
 */

export interface HealCandidate {
    selector: string;
    strategy: string;
    matchCount: number;
    visible: boolean;
    reasoning: string;
}

export interface RejectedCandidate {
    selector: string;
    reason: string;
}

export interface HealReport {
    failedSelector: string;
    intent: string;
    verified: HealCandidate[];
    rejected: RejectedCandidate[];
    unavailableReason?: string;
}
