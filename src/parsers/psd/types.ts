import { LfPair } from "../types";

export type PSDHeader = {
	signature: string; //Should always === '8BPS' if not fail
	version: number; //Always 1 if not fail.
	channels: number; //Number of channels supported.... (How do I compress 56 channels to 4)... I guess it depends on how said channels are being used.
	size: LfPair;
	depth: number;
	colorMode: 0 | 1 | 2 | 3 | 4 | 7 | 8 | 9
}