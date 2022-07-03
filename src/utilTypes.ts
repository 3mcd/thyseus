export type Class<T extends object = {}> = new (...args: any[]) => T;

export interface System {
	args: any[];
	execute(...args: any[]): void;
}

type WaitAsyncResult =
	| { async: false; value: 'ok' }
	| { async: false; value: 'not-equal' }
	| { async: false; value: 'timed-out' }
	| { async: true; value: Promise<'ok'> };

declare global {
	interface Atomics {
		waitAsync(
			typedArray: Int32Array,
			index: number,
			value: number,
			timeout?: number,
		): WaitAsyncResult;
		waitAsync(
			typedArray: BigInt64Array,
			index: number,
			value: bigint,
			timeout?: number,
		): WaitAsyncResult;
	}
}
