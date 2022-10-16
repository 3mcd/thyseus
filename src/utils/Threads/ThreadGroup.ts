import ThreadProtocol, {
	type SendableType,
	type Primitive,
	type BinaryView,
	type SendableClass,
	type SendableInstance,
} from './ThreadProtocol';

// Symbols can't be sent to/from workers
const IsSerialized = '@SERIALIZED';
type SentInstance = [typeof IsSerialized, number, SendableType];
type Listener<I extends SendableType = void, O extends SendableType = void> = (
	data: I,
) => O;
type ThreadMessage = [id: number, channel: string, data: SendableType];
type ThreadMessageEvent = MessageEvent<ThreadMessage> & {
	currentTarget: WorkerOrGlobal;
};
interface WorkerOrGlobal {
	postMessage(content: any): void;
	addEventListener(
		type: 'message',
		fn: (event: MessageEvent<ThreadMessage>) => void,
	): void;
	removeEventListener(
		type: 'message',
		fn: (event: MessageEvent<ThreadMessage>) => void,
	): void;
}

export default class ThreadGroup {
	static isMainThread = !!globalThis.document;

	static spawn(
		count: number,
		url: string | URL | undefined,
		sendableTypes: SendableClass<any>[],
	): ThreadGroup {
		return new this(
			ThreadGroup.isMainThread
				? Array.from(
						{ length: count },
						// NOTE: If count > 1, url is defined.
						() => new Worker(url!, { type: 'module' }),
				  )
				: [globalThis],
			sendableTypes,
		);
	}

	#nextId = 0;
	#resolvers = new Map<number, (value: any) => void>();
	#listeners = {} as Record<string, Listener<any>>;

	#threads: WorkerOrGlobal[];
	#sendableTypes: SendableClass<any>[];
	constructor(
		threads: WorkerOrGlobal[],
		sendableTypes: SendableClass<any>[],
	) {
		this.#threads = threads;
		this.#sendableTypes = sendableTypes;

		const handleMessage = ({
			currentTarget,
			data: [id, channel, data],
		}: ThreadMessageEvent) => {
			if (this.#resolvers.has(id)) {
				this.#resolvers.get(id)!(this.#deserialize(data));
				this.#resolvers.delete(id);
			} else if (channel in this.#listeners) {
				currentTarget.postMessage([
					id,
					channel,
					this.#serialize(
						this.#listeners[channel](this.#deserialize(data)),
					),
				]);
			} else {
				currentTarget.postMessage([id, channel, null]);
			}
		};
		for (const thread of this.#threads) {
			thread.addEventListener('message', handleMessage as any);
		}
	}

	/**
	 * Sets a callback to be called when a message is received on a particular channel.
	 * **NOTE**: Only **one** listener can be set per channel.
	 * @param channel The channel to listen to.
	 * @param listener A callback that is called when a message is received on this channel. The callback receives the content of the message, and its return will be sent in response.
	 */
	setListener<I extends SendableType = void, O extends SendableType = void>(
		channel: string,
		listener: Listener<I, O>,
	) {
		this.#listeners[channel] = listener;
	}

	/**
	 * Deletes the listener for a message channel.
	 * @param channel The channel to unsubscribe from.
	 */
	deleteListener(channel: string) {
		delete this.#listeners[channel];
	}

	/**
	 * Sends a value to a channel.
	 * @param channel The channel to send the value to.
	 * @param message The value to send.
	 * @returns A promise, resolves to an array of results from all threads.
	 */
	send<T extends SendableType = void>(
		channel: string,
		message: SendableType,
	): Promise<T[]> {
		const data = this.#serialize(message);
		return Promise.all(
			this.#threads.map(thread => {
				const id = this.#nextId++;
				thread.postMessage([id, channel, data]);
				return new Promise<T>(r => this.#resolvers.set(id, r));
			}),
		);
	}

	/**
	 * **WARNING: This method is order-sensitive and should only be called while the main thread and worker threads are executing the same code (i.e., while a world is being built).**
	 * **Use `send` and `setListener` for more flexible usage.**
	 *
	 * On the main thread, creates a value, sends it to all threads, and waits for them to receive it.
	 *
	 * On worker threads, waits to receive the value sent by the main thread.
	 *
	 * @param create A callback to create the value you wish to send - only invoked on the main thread.
	 * @returns A promise resolving to the return of the `create` callback.
	 */
	async sendOrReceive<T extends SendableType>(create: () => T): Promise<T> {
		const channel = '@@';
		if (ThreadGroup.isMainThread) {
			const result = create();
			await this.send(channel, result);
			return result;
		} else {
			const result = await new Promise<T>(r =>
				this.setListener(channel, r as any),
			);
			this.deleteListener(channel);
			return result;
		}
	}

	#serialize(value: SendableType): unknown {
		if (typeof value !== 'object' || value === null) {
			return value;
		}
		if (isSendableInstance(value)) {
			return [
				IsSerialized,
				this.#sendableTypes.indexOf(value.constructor as SendableClass),
				this.#serialize(value[ThreadProtocol.Send]()),
			];
		}
		for (const key in value) {
			//@ts-ignore
			value[key] = this.#serialize(value[key], this.#sendableTypes);
		}
		return value;
	}

	#deserialize(value: SendableType): unknown {
		if (isPrimitive(value) || isBinaryView(value)) {
			return value;
		}
		if (isSentInstance(value)) {
			const [, typeKey, data] = value;
			const deserializedData = this.#deserialize(data);
			const TypeConstructor = this.#sendableTypes[typeKey];
			return TypeConstructor[ThreadProtocol.Receive](deserializedData);
		}
		for (const key in value) {
			//@ts-ignore
			value[key] = this.#deserialize(value[key], this.#sendableTypes);
		}
		return value;
	}
}

const isSendableInstance = (val: object): val is SendableInstance =>
	ThreadProtocol.Send in val;
const isSentInstance = (val: object): val is SentInstance =>
	Array.isArray(val) && val.length === 3 && val[0] === IsSerialized;
const TypedArray = Object.getPrototypeOf(Uint8Array);
const isPrimitive = (value: unknown): value is Primitive =>
	typeof value !== 'object' && typeof value !== 'function' && value !== null;
const isBinaryView = (value: unknown): value is BinaryView =>
	value instanceof TypedArray ||
	value instanceof DataView ||
	value instanceof ArrayBuffer ||
	(typeof SharedArrayBuffer !== undefined &&
		value instanceof SharedArrayBuffer);

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, vi, beforeEach } = import.meta.vitest;

	class MockWorker {
		target?: MockWorker;

		handler: any;
		addEventListener(_: 'message', handler: any): this {
			this.handler = handler;
			return this;
		}
		removeEventListener(): void {}
		postMessage(data: any) {
			setTimeout(() => {
				this.target!.handler({ currentTarget: this.target, data });
			}, 10);
		}
	}
	const getMockThreads = (sendables: SendableClass<any>[] = []) => {
		const mock1 = new MockWorker();
		const mock2 = new MockWorker();
		mock1.target = mock2;
		mock2.target = mock1;
		return [
			new ThreadGroup([mock1], sendables),
			new ThreadGroup([mock2], sendables),
		];
	};

	beforeEach(() => {
		ThreadGroup.isMainThread = true;
	});

	it('send returns a promise with an array of results from workers', async () => {
		const [group1, group2] = getMockThreads();
		group2.setListener<number>('add2', data => data + 2);
		group2.setListener<{ x: number }>('set3', data => ({ ...data, x: 3 }));
		expect(await group1.send('add2', 0)).toStrictEqual([2]);
		expect(await group1.send('add2', 1)).toStrictEqual([3]);
		expect(await group1.send('add2', 3.5)).toStrictEqual([5.5]);
		expect(await group1.send('set3', { x: 2 })).toStrictEqual([{ x: 3 }]);
	});

	it('sends objects implementing Thread Send/Receive Protocol', async () => {
		class MySendableClass {
			data = new Uint8Array(8);

			[ThreadProtocol.Send]() {
				return this.data;
			}
			static [ThreadProtocol.Receive](data: Uint8Array) {
				const ret = new this();
				ret.data = data;
				return ret;
			}
		}
		const [group1, group2] = getMockThreads([MySendableClass]);
		group2.setListener<MySendableClass>('setAscending', instance => {
			for (let i = 0; i < 8; i++) {
				instance.data[i] = i;
			}
		});
		const val = new MySendableClass();
		val.data.forEach(x => expect(x).toBe(0));
		await group1.send('setAscending', val);
		val.data.forEach((x, i) => expect(x).toBe(i));
	});

	it('receives null back if no listener is set up', async () => {
		const [group1, group2] = getMockThreads();
		expect(await group1.send('do something!', 0)).toStrictEqual([null]);
		group2.setListener<number>('do something!', n => n * 2);
		expect(await group1.send('do something!', 8)).toStrictEqual([16]);
		group2.deleteListener('do something!');
		expect(await group1.send('do something!', 0)).toStrictEqual([null]);
	});

	it('sendOrReceive works', async () => {
		const [group1, group2] = getMockThreads();
		const mock1 = vi.fn(() => 3);
		const mock2 = vi.fn(() => 3);
		const promise1 = group1.sendOrReceive(mock1);
		ThreadGroup.isMainThread = false;
		const promise2 = group2.sendOrReceive(mock2);

		const result2 = await promise2;
		const result1 = await promise1;
		expect(result2).toBe(3);
		expect(result1).toBe(3);
		expect(mock1).toHaveBeenCalledTimes(1);
		expect(mock2).toHaveBeenCalledTimes(0);
	});
}