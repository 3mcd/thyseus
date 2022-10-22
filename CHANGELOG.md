# Changelog

## v0.4.0 (October 22, 2022)

### 💥 Breaking Changes

-   Some elements of `WorldBuilder` and `World` have changed.
    -   `components` on World is now a `ComponentType[]`.
    -   `queries` on **World** is now a `Query[]`.
    -   `queries` and `registerQuery` on **WorldBuilder** have been removed. At
        the moment, queries do not need to be pre-registered.
-   Some properties previously available on `WorldCommands` no longer exist. All
    methods remain the same.
    -   It is _strongly suggested_ that you do not access properties on
        `WorldCommands` and only use its methods, as the internal implementation
        of `WorldCommands` is likely to continue to change (pre-1.0).
-   Some properties previously available on `Query` no longer exist. Iteration
    remains the same.
    -   Namely, queries no longer need to track which entities match them, and
        so have no `entities` field.
    -   As above, it is strongly suggested that you simply iterate over query
        instances, as the rest of the properties are subject to change.
-   `threads` on `World` have been changed from `Thread[]` to `ThreadGroup`.
    -   Some of the functionality of ThreadGroup will be expanded to be
        consumer-facing in a future update.

### ✨ Features

-   Now uses
    [archetypes](https://github.com/SanderMertens/ecs-faq#archetypes-aka-dense-ecs-or-table-based-ecs)
    for component storage! As a result, **_memory usage is significantly
    reduced_**, and iterating queries should be more cache-friendly.
    -   Archetypes can be accessed with `world.archetypes`
        (`Map<bigint, Table>`).
    -   Bear in mind that archetypes may be somewhat slower at the moment than
        the previous storage mechanism - especially adding/removing Components -
        but have the potential to be much faster - more benchmarking around the
        bottlenecks of the current implementation is needed, first.
-   Entities are now a _generational_ index.
    -   Every entity has an associated generation. Whenever an entity is
        despawned, the generation is incremented.
    -   Entity data can be queried for with the `Entity` component (all living
        entities have this component, so it does not affect what a query
        matches).
    -   The `Entity` component has no setters and includes a few methods that
        can be used to queue components for add/remove, or to despawn the
        entity - `WorldCommands.spawn()` returns an Entity component! These
        methods do not require a lock, and so **_Entity can (and should) be
        accessed immutably_**.
        ```ts
        class Entity {
        	get id(): bigint; // uint64
        	get generation(): number; // uint32
        	get entityIndex(): number; // uint32
        	insert(Component: ComponentType<any>): this;
        	remove(Component: ComponentType): this;
        	despawn(): void;
        }
        ```
-   Added `getNewTableSize: (prev: number) => number` to world config, which
    determines how archetype tables grow. By default, 8 entities are allocated
    for a table, and table size is doubled each grow.
    -   When creating a new table, the `prev` argument will be 0.
    -   _Returned values **must** be multiples of 8_ - failure to do so will
        result in undefined behavior!
-   Systems can now return promises, which will be `await`ed before continuing
    system execution on that thread. This should not be utilized often, as any
    data a system locks will remain locked until the promise is resolved!

### 🔧 Maintenance

-   Bumped dev dependency versions.

## v0.3.0 (September 11, 2022)

### 💥 Breaking Changes

-   Single-threaded worlds use the same executor as multithreaded worlds. As a
    result, they will respect passed dependencies. Unfortunately, they now
    require `Atomics.waitAsync` - this will be resolved in a future release.
-   Components can no longer be used as Resources (i.e.,
    `class MyResource extends Component({ ... }) {}` no longer works as
    expected). The `Resource()` function is now provided to serve this purpose.
    `Resource()` is nearly identical to `Component()`, but requires a schema.
-   `EntityManager` has been replaced with `WorldCommands` - see below for
    details. Systems using `P.Entities()` must be updated to `P.Commands()` and
    the new Commands API.
-   The `Thread` class is no longer exposed (not intended for consumer use). To
    access the `Send` and `Receive` symbols, you can instead
    `import { ThreadProtocol } from 'thyseus'`.

### ✨ Features

-   New `Commands` API!
    -   Commands can be accessed on any thread, and is disjoint with all other
        parameters - **_including itself_**.
    -   Commands functionally queues modifications to entities - updates to
        queries occurs in a system that intersects with all other systems. If
        you need systems to run _after_ entity modification, you can
        `import { applyCommands } from 'thyseus'` and specify it as a
        dependency. Be aware that for multithreaded worlds, doing so will create
        a hard sync point. Last, WorldBuilders always add the `applyCommands`
        system - you don't need to add it yourself.
-   New minimal plugin API!
    -   Plugins are just functions that accept a WorldBuilder instance. They can
        add systems to the world just as normal, and are useful for creating
        shared groups of systems that may depend on eachother.
    -   Add plugins to a world with the `addPlugin` method.
    -   The `definePlugin` function is provided for type help.
-   New `World` system parameter.
    -   This provides direct access to the World and all of its data. It
        intersects with all other system parameters (creating a sync point for
        multithreaded worlds). Systems that access `World` always run on the
        main thread, and can therefore access main-thread-only resources if
        needed.
-   New methods for `WorldBuilder`, and some previously internal properties on
    `World` and `WorldBuilder` are exposed thru getters! Most of these are
    designed for internal use, but could be useful for advanced use cases.
    -   As a result of this and other refactors, user-defined system parameter
        descriptors are now possible. This is a more advanced pattern, and more
        documentation around this will be available in the future.

### 🔧 Maintenance

-   Improved annotations on classes/methods.
-   Cleaned up type names - Component Classes are now `ComponentType`, Resource
    Classes are now `ResourceType`.
-   Major behind-the-scenes refactoring. Overall package size has been reduced!
-   Improved test coverage.
-   Bumped dev dependency versions.

## v0.2.0 (July 31, 2022)

### 💥 Breaking Changes

-   `defineSystem()` now returns an object rather adding a `parameters` property
    to the provided function. As a result, the same function can be re-used for
    multiple systems.

### ✨ Features

-   You can now specify dependencies between systems to force a specific
    execution order! The `addSystem()` method now accepts an optional second
    argument, which can be used to specify if a system must execute before/after
    other systems.

    ```ts
    const updateTime = defineSystem(/* ... */);
    const handleInput = defineSystem(/* ... */);
    const mover = defineSystem(/* ... */);
    const draw = defineSystem(/* ... */);

    const myWorld = World.new()
    	// Mover will not run until after handleInput has finished.
    	.addSystem(mover, { after: [handleInput] })
    	// A matching before/after pair is permitted but not required.
    	.addSystem(handleInput)
    	// draw will not run until all intersecting systems have finished.
    	.addSystem(draw, { afterAll: true })
    	// updateTime must run before any intersecting systems may run.
    	.addSystem(updateTime, { beforeAll: true });

    // Dependencies look like this:
    interface Dependencies {
    	before?: SystemDefinition[];
    	after?: SystemDefinition[];
    	beforeAll?: boolean;
    	afterAll?: boolean;
    }
    ```

    A few notes on dependencies:

    -   Both explicit (`before`, `after`) and implicit (`beforeAll`, `afterAll`)
        dependencies apply only to systems that intersect. For example, if
        systems `A` and `B` are disjoint, then `A before B` will have no effect.
        Similarly, `A beforeAll` _will **not**_ guarantee that `A` runs before
        `B` (but will guarantee that `A` runs before any other systems that `A`
        intersects with).
    -   Explicit dependencies take precedence over implicit dependencies. Given
        intersecting `A` and `B`, `(B beforeAll), (A before B)` will guarantee
        that A runs before B.
    -   If no explicit resolution is provided, implicit dependencies are
        evaluated _in the order they are passed in_.
        -   Given `(A beforeAll), (B beforeAll)`, `A` will be guaranteed to
            execute before `B`.
        -   Given `(A afterAll), (B afterAll)`, `A` will be guaranteed to
            execute _after_ `B`.
    -   Directly contradictory dependencies - such as `A after A` or
        `(A before B), (B before A)` - will cause an error to be thrown when the
        world is built.
    -   Dependencies apply only to multithreaded worlds for the moment. In the
        future, single threaded worlds will also use dependencies.

-   Resources can now also be made thread-friendly by implementing Thyseus's
    internal Thread Send/Receive protocol (i.e., classes that implement
    `static [Thread.Receive]() {}` and `[Thread.Send]() {}` methods).
    -   Constructors for classes implementing `Send`/`Receive` will be called
        with the world config.
    -   This is the recommended method of defining resources.
-   Resources that are bound to the main thread for initialization, but are
    readable and/or writeable from multiple threads (for example, a `Keyboard`
    resource that needs to register listeners for `keydown`/`keyup` events) can
    implement a static `create()` method that will be used rather than its
    constructor. This method receives the same arguments its constructor would
    be called with (`WorldConfig` for resources implementing Thread protocol, a
    store & index for Component-based resources), and must return an instance of
    the class.

### 🔧 Maintenance

-   Improved test coverage.
-   Bump Vite/Vitest version.
-   Use vite library mode to build.

## v0.1.0 (July 2, 2022)

-   Initial release.
