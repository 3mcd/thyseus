// Generated by dts-bundle-generator v7.0.0

type SendableType =
	| void
	| null
	| undefined
	| boolean
	| number
	| string
	| bigint
	| ArrayBuffer
	| SharedArrayBuffer
	| Uint8Array
	| Uint16Array
	| Uint32Array
	| BigUint64Array
	| Int8Array
	| Int16Array
	| Int32Array
	| BigInt64Array
	| Float32Array
	| Float64Array
	| Uint8ClampedArray
	| DataView
	| Date
	| RegExp
	| Blob
	| File
	| FileList
	| ImageBitmap
	| ImageData
	| SendableType[]
	| {
			[key: string]: SendableType;
	  }
	| Map<SendableType, SendableType>
	| Set<SendableType>;
type Listener<I extends SendableType = void, O extends SendableType = void> = (
	data: I,
) => O;
type ThreadMessage = [id: number, channel: string, data: SendableType];
interface WorkerOrGlobal {
	postMessage(content: SendableType): void;
	addEventListener(
		type: 'message',
		fn: (event: MessageEvent<ThreadMessage>) => void,
	): void;
	removeEventListener(
		type: 'message',
		fn: (event: MessageEvent<ThreadMessage>) => void,
	): void;
}
declare class ThreadGroup {
	#private;
	static isMainThread: boolean;
	isMainThread: boolean;
	static spawn(count: number, url: string | URL | undefined): ThreadGroup;
	constructor(threads: WorkerOrGlobal[]);
	/**
	 * Sets a callback to be called when a message is received on a particular channel.
	 * **NOTE**: Only **one** listener can be set per channel.
	 * @param channel The channel to listen to.
	 * @param listener A callback that is called when a message is received on this channel. The callback receives the content of the message, and its return will be sent in response.
	 */
	setListener<I extends SendableType = void, O extends SendableType = void>(
		channel: string,
		listener: Listener<I, O>,
	): void;
	/**
	 * Deletes the listener for a message channel.
	 * @param channel The channel to unsubscribe from.
	 */
	deleteListener(channel: string): void;
	/**
	 * Sends a value to a channel.
	 * @param channel The channel to send the value to.
	 * @param message The value to send.
	 * @returns A promise, resolves to an array of results from all threads.
	 */
	send<T extends SendableType = void>(
		channel: string,
		message: SendableType,
	): Promise<T[]>;
	/**
	 * On the main thread, creates a value, pushes it to the queue, and returns the value.
	 *
	 * On Worker threads, removes and returns the next item in the queue.
	 *
	 * **NOTE:** Queue must be manually sent between threads - use with `ThreadGroup.prototoype.wrapInQueue`.
	 * @param create A function to create the value - only called on the main thread.
	 * @returns The value created by `create` function.
	 */
	queue<T extends SendableType>(create: () => T): T;
	wrapInQueue<T = void>(callback: () => T | Promise<T>): Promise<T>;
}
type DiscriminatedUnion<L, R> =
	| (L & {
			[Key in keyof R]?: never;
	  })
	| (R & {
			[Key in keyof L]?: never;
	  });
declare function string({
	characterCount,
	byteLength,
}: DiscriminatedUnion<
	{
		byteLength: number;
	},
	{
		characterCount: number;
	}
>): (prototype: object, propertyKey: string | symbol) => void;
type PrimitiveName =
	| 'u8'
	| 'u16'
	| 'u32'
	| 'u64'
	| 'i8'
	| 'i16'
	| 'i32'
	| 'i64'
	| 'f32'
	| 'f64';
type ArrayOptions = {
	type: PrimitiveName;
	length: number;
};
declare function array({
	type,
	length,
}: ArrayOptions): (prototype: object, propertyKey: string | symbol) => void;
declare function substruct(
	struct: Struct,
): (prototype: object, propertyKey: string | symbol) => void;
interface Class {
	new (...args: any[]): object;
}
type StructStore = {
	buffer: ArrayBuffer;
	u8: Uint8Array;
	u16?: Uint16Array;
	u32?: Uint32Array;
	u64?: BigUint64Array;
	i8?: Int8Array;
	i16?: Int16Array;
	i32?: Int32Array;
	i64?: BigInt64Array;
	f32?: Float32Array;
	f64?: Float64Array;
};
interface Struct {
	/**
	 * The schema bitfield used to create stores for this struct.
	 */
	schema?: number;
	/**
	 * The alignment of this type - equal to the number of bytes of the largest primitive type this struct contains (1, 2, 4, or 8).
	 */
	alignment?: number;
	/**
	 * The size of this struct, including padding. Always a multiple of alignment.
	 */
	size?: number;
	new (store: StructStore, index: number, commands: WorldCommands): object;
}
export declare function struct(): (targetClass: Class) => any;

type stringDec = typeof string;
type arrayDec = typeof array;
type substructDec = typeof substruct;
export declare namespace struct {
	var bool: () => (prototype: object, propertyKey: string | symbol) => void;
	var u8: () => (prototype: object, propertyKey: string | symbol) => void;
	var u16: () => (prototype: object, propertyKey: string | symbol) => void;
	var u32: () => (prototype: object, propertyKey: string | symbol) => void;
	var u64: () => (prototype: object, propertyKey: string | symbol) => void;
	var i8: () => (prototype: object, propertyKey: string | symbol) => void;
	var i16: () => (prototype: object, propertyKey: string | symbol) => void;
	var i32: () => (prototype: object, propertyKey: string | symbol) => void;
	var i64: () => (prototype: object, propertyKey: string | symbol) => void;
	var f32: () => (prototype: object, propertyKey: string | symbol) => void;
	var f64: () => (prototype: object, propertyKey: string | symbol) => void;
	var string: stringDec;
	var array: arrayDec;
	var substruct: substructDec;
}
declare class Table {
	columns: Map<Struct, StructStore>;
	meta: Uint32Array;
	static create(world: World, components: Struct[]): Table;
	constructor(columns: Map<Struct, StructStore>, meta: Uint32Array);
	get size(): number;
	set size(value: number);
	get capacity(): number;
	set capacity(val: number);
	get isFull(): boolean;
	add(entityId: bigint): void;
	delete(index: number): void;
	move(index: number, targetTable: Table): void;
	grow(world: World): void;
}
export declare class Entity {
	#private;
	static schema: number;
	static size: number;
	private __$$s;
	private __$$b;
	constructor(store: StructStore, index: number, commands: WorldCommands);
	private get __$$i();
	private set __$$i(value);
	/**
	 * The entity's world-unique integer id (uint64).
	 * Composed of an entity's generation & index.
	 */
	get id(): bigint;
	/**
	 * The index of this entity (uint32).
	 */
	get index(): number;
	/**
	 * The generation of this entity (uint32).
	 */
	get generation(): number;
	/**
	 * Queues a component to be inserted into this entity.
	 * @param Component The Component **class** to insert into the entity.
	 * @returns `this`, for chaining.
	 */
	insert(Component: Struct): this;
	/**
	 * Queues a component to be removed from this entity.
	 * @param Component The Component **class** to remove from the entity.
	 * @returns `this`, for chaining.
	 */
	remove(Component: Struct): this;
	/**
	 * Queues this entity to be despawned.
	 * @returns `void`
	 */
	despawn(): void;
}
declare class BigUintArray {
	#private;
	static getBufferLength(width: number, length: number): number;
	width: number;
	length: number;
	constructor(width: number, length: number, data: Uint8Array);
	get bytesPerElement(): number;
	get byteLength(): number;
	get(element: number): bigint;
	set(element: number, value: bigint): void;
	OR(element: number, value: bigint): void;
	XOR(element: number, value: bigint): void;
}
declare class Entities {
	#private;
	static fromWorld(world: World): Entities;
	generations: Uint32Array;
	tableIds: BigUintArray;
	row: Uint32Array;
	constructor(
		generations: Uint32Array,
		tableIds: BigUintArray,
		row: Uint32Array,
		data: Uint32Array,
		free: Uint32Array,
	);
	spawn(): bigint;
	despawn(id: bigint): void;
	getTableId(id: bigint): bigint;
	getRow(id: bigint): number;
	setLocation(entityId: bigint, tableId: bigint, row: number): void;
}
declare class WorldCommands {
	#private;
	queue: Map<bigint, bigint>;
	constructor(entities: Entities, components: Struct[]);
	/**
	 * Queues an entity to be spawned.
	 * @returns `EntityCommands` to add/remove components from an entity.
	 */
	spawn(): Entity;
	/**
	 * Queues an entity to be despawned.
	 * @param id The id of the entity to despawn.
	 * @returns `this`, for chaining.
	 */
	despawn(id: bigint): this;
	/**
	 * Gets an entity to modify.
	 * @param id The id of the entity to get.
	 * @returns `EntityCommands` to add/remove components from an entity.
	 */
	get(id: bigint): Entity;
	insertInto(id: bigint, Component: Struct): void;
	removeFrom(id: bigint, Component: Struct): void;
}
type DescriptorToArgument<T extends Descriptor> = ReturnType<T['intoArgument']>;
interface Descriptor {
	isLocalToThread(): boolean;
	intersectsWith(other: unknown): boolean;
	onAddSystem(worldBuilder: WorldBuilder): void;
	intoArgument(world: World): any;
}
declare class CommandsDescriptor implements Descriptor {
	isLocalToThread(): boolean;
	intersectsWith(other: unknown): boolean;
	intoArgument(world: World): WorldCommands;
	onAddSystem(builder: WorldBuilder): void;
}
declare class Optional<T extends object | Mut<object>> {
	value: Struct | Mut<any>;
	constructor(
		value:
			| T
			| {
					new (...args: any): T;
			  },
	);
}
declare class Mut<T extends object> {
	value: Struct;
	constructor(value: { new (...args: any): T });
}
declare class With<T extends object | object[]> {
	value: Struct | Struct[];
	constructor(
		value:
			| {
					new (...args: any): T;
			  }
			| {
					new (...args: any): T;
			  }[],
	);
}
declare class Without<T extends object | object[]> {
	value: Struct | Struct[];
	constructor(
		value:
			| {
					new (...args: any): T;
			  }
			| {
					new (...args: any): T;
			  }[],
	);
}
type OrContent =
	| With<object>
	| Without<object>
	| Or<OrContent, OrContent>
	| OrContent[];
declare class Or<L extends OrContent, R extends OrContent> {
	l: OrContent;
	r: OrContent;
	constructor(l: L, r: R);
}
type Filter = With<any> | Without<any> | Or<any, any> | Filter[];
type Accessors = object | object[];
type QueryIterator<A extends Accessors> = Iterator<
	A extends any[]
		? {
				[Index in keyof A]: IteratorItem<A[Index]>;
		  }
		: IteratorItem<A>
>;
type IteratorItem<I> = I extends Optional<infer X>
	? X extends Mut<infer Y>
		? Y | null
		: Readonly<X> | null
	: I extends Mut<infer X>
	? X
	: Readonly<I>;
declare class Query<A extends Accessors, F extends Filter = []> {
	#private;
	constructor(
		withFilters: bigint[],
		withoutFilters: bigint[],
		isIndividual: boolean,
		components: Struct[],
		commands: WorldCommands,
	);
	get size(): number;
	[Symbol.iterator](): QueryIterator<A>;
	testAdd(tableId: bigint, table: Table): void;
}
type AccessDescriptor =
	| Struct
	| Mut<object>
	| Optional<object>
	| Optional<Mut<object>>;
type UnwrapElement<E extends any> = E extends Class ? InstanceType<E> : E;
declare class QueryDescriptor<
	A extends AccessDescriptor | AccessDescriptor[],
	F extends Filter = [],
> implements Descriptor
{
	#private;
	components: Struct[];
	writes: boolean[];
	optionals: boolean[];
	filters: F;
	isIndividual: boolean;
	constructor(accessors: A | [...(A extends any[] ? A : never)], filters?: F);
	isLocalToThread(): boolean;
	intersectsWith(other: unknown): boolean;
	onAddSystem(builder: WorldBuilder): void;
	intoArgument(world: World): Query<
		A extends any[]
			? {
					[Index in keyof A]: UnwrapElement<A[Index]>;
			  }
			: UnwrapElement<A>,
		F
	>;
}
declare class ResourceDescriptor<T extends Class | Mut<Class>>
	implements Descriptor
{
	resource: Class;
	canWrite: boolean;
	constructor(resource: T);
	isLocalToThread(): boolean;
	intersectsWith(other: unknown): boolean;
	onAddSystem(builder: WorldBuilder): void;
	intoArgument(
		world: World,
	): T extends Mut<infer X>
		? X
		: Readonly<InstanceType<T extends Class ? T : never>>;
}
declare class WorldDescriptor implements Descriptor {
	isLocalToThread(): boolean;
	intersectsWith(other: unknown): boolean;
	intoArgument(world: World): World;
	onAddSystem(builder: WorldBuilder): void;
}
declare const descriptors: {
	readonly Commands: () => CommandsDescriptor;
	readonly Query: <
		A extends AccessDescriptor | AccessDescriptor[],
		F extends Filter = [],
	>(
		accessors: A | [...(A extends any[] ? A : never)],
		filters?: F | undefined,
	) => QueryDescriptor<A, F>;
	readonly Res: <T extends Class | Mut<Class>>(
		resource: T,
	) => ResourceDescriptor<T>;
	readonly World: () => WorldDescriptor;
	readonly Mut: <T_1 extends object>(
		value: new (...args: any) => T_1,
	) => Mut<T_1>;
	readonly Optional: <T_2 extends object | Mut<object>>(
		value: T_2 | (new (...args: any) => T_2),
	) => Optional<T_2>;
	readonly With: <T_3 extends object | object[]>(
		value: (new (...args: any) => T_3) | (new (...args: any) => T_3)[],
	) => With<T_3>;
	readonly Without: <T_4 extends object | object[]>(
		value: (new (...args: any) => T_4) | (new (...args: any) => T_4)[],
	) => Without<T_4>;
	readonly Or: <L extends OrContent, R extends OrContent>(
		l: OrContent,
		r: OrContent,
	) => Or<L, R>;
};
type Descriptors = typeof descriptors;
type Parameters<T extends Descriptor[]> = {
	[Index in keyof T]: DescriptorToArgument<T[Index]>;
};
interface SystemDefinition<T extends Descriptor[] = Descriptor[]> {
	parameters: T;
	fn(...args: Parameters<T>): void | Promise<void>;
}
export declare function defineSystem<T extends Descriptor[]>(
	parameters: (descriptors: Descriptors) => [...T],
	fn: (...args: Parameters<T>) => void | Promise<void>,
): SystemDefinition<T>;
interface Dependencies {
	before?: SystemDefinition[];
	after?: SystemDefinition[];
	beforeAll?: boolean;
	afterAll?: boolean;
}
export declare const applyCommands: SystemDefinition<[WorldDescriptor]>;
interface System {
	args: any[];
	execute(...args: any[]): void | Promise<void>;
}
interface WorldConfig {
	threads: number;
	maxEntities: number;
	getNewTableSize(prev: number): number;
}
interface SingleThreadedWorldConfig extends WorldConfig {
	threads: 1;
}
type Plugin = (worldBuilder: WorldBuilder) => void;
export declare function definePlugin<T extends Plugin>(plugin: T): T;
declare class WorldBuilder {
	#private;
	systems: SystemDefinition<Descriptor[]>[];
	systemDependencies: (Dependencies | undefined)[];
	components: Set<Struct>;
	resources: Set<Class>;
	threadChannels: Record<string, (world: World) => (data: any) => any>;
	config: WorldConfig;
	url: string | URL | undefined;
	constructor(config: WorldConfig, url: string | URL | undefined);
	/**
	 * Adds a system to the world and processes its parameter descriptors.
	 * @param system The system to add.
	 * @param dependencies The dependencies of this system.
	 * @returns `this`, for chaining.
	 */
	addSystem(system: SystemDefinition, dependencies?: Dependencies): this;
	/**
	 * Adds a system to the world _**that will only be run once when built**_.
	 * @param system The system to add.
	 * @returns `this`, for chaining.
	 */
	addStartupSystem(system: SystemDefinition): this;
	/**
	 * Passes this WorldBuilder to the provided plugin function.
	 * @param plugin The plugin to pass this WorldBuilder to.
	 * @returns `this`, for chaining.
	 */
	addPlugin(plugin: Plugin): this;
	/**
	 * Registers a Component in the world. Called automatically for all queried components when a system is added.
	 * @param struct The struct to register.
	 * @returns `this`, for chaining.
	 */
	registerComponent(struct: Struct): this;
	/**
	 * Registers a Resource in the world. Called automatically for all accessed resources when a system is added.
	 * @param ResourceType The ResourceType to register.
	 * @returns `this`, for chaining.
	 */
	registerResource(ResourceType: Class): this;
	/**
	 * Registers a channel for threads. When a thread receives a message, it will run the callback created by `listenerCreator`.
	 * @param channel The **_unique_** name of the channel. _NOTE: Calling this method again with the same channel will override the previous listener!_
	 * @param listenerCreator A creator function that will be called with the world when built. Should return a function that receives whatever data that is sent across threads, and returns data to be sent back.
	 * @returns `this`, for chaining.
	 */
	registerThreadChannel<
		I extends SendableType = void,
		O extends SendableType = void,
	>(channel: string, listenerCreator: (world: World) => (data: I) => O): this;
	/**
	 * Builds the world.
	 * `World` instances cannot add new systems or register new types.
	 * @returns `Promise<World>`
	 */
	build(): Promise<World>;
}
declare class Executor {
	#private;
	static fromWorld(
		world: World,
		systems: SystemDefinition[],
		systemDependencies: (Dependencies | undefined)[],
	): Executor;
	constructor(
		intersections: bigint[],
		dependencies: bigint[],
		systemsToExecute: Uint16Array,
		status: BigUintArray,
		local: Set<number>,
		id: string,
	);
	start(): void;
	reset(): void;
	onReady(fn: () => void): Promise<void>;
	[Symbol.asyncIterator](): AsyncGenerator<number, void, unknown>;
}
export declare class World {
	#private;
	static new(config?: Partial<SingleThreadedWorldConfig>): WorldBuilder;
	static new(config: Partial<WorldConfig>, url: string | URL): WorldBuilder;
	archetypes: Map<bigint, Table>;
	queries: Query<any, any>[];
	config: WorldConfig;
	resources: Map<Class, object>;
	threads: ThreadGroup;
	systems: System[];
	executor: Executor;
	commands: WorldCommands;
	entities: Entities;
	components: Struct[];
	constructor(
		config: WorldConfig,
		threads: ThreadGroup,
		components: Struct[],
		resourceTypes: Class[],
		systems: SystemDefinition[],
		dependencies: (Dependencies | undefined)[],
		channels: Record<
			string,
			(world: World) => (data: SendableType) => SendableType
		>,
	);
	moveEntity(entityId: bigint, targetTableId: bigint): void;
	createBuffer(byteLength: number): ArrayBufferLike;
	update(): Promise<void>;
}

export {};
