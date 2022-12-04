import {
	createFilter,
	Query,
	Mut,
	Optional,
	Filter,
	With,
	Without,
	Or,
} from '../../Queries';
import { assert } from '../../utils/assert';
import type { WorldBuilder } from '../../World/WorldBuilder';
import type { Descriptor } from './Descriptor';
import type { World } from '../../World';
import type { Class, Struct } from '../../struct';

export type AccessDescriptor =
	| Struct
	| Mut<object>
	| Optional<object>
	| Optional<Mut<object>>;

export class QueryDescriptor<
	A extends AccessDescriptor[],
	F extends Filter = [],
> implements Descriptor
{
	components: Struct[] = [];
	writes: boolean[] = [];
	filters: F;
	constructor(accessors: [...A], filters: F = [] as any) {
		for (const component of accessors) {
			const isMut =
				component instanceof Mut ||
				(component instanceof Optional &&
					component.value instanceof Mut);
			this.components.push(
				component instanceof Mut
					? component.value
					: component instanceof Optional
					? component.value instanceof Mut
						? component.value.value
						: component.value
					: component,
			);
			assert(
				this.components[this.components.length - 1].size! > 0,
				'You may not request direct access to ZSTs - use a With filter instead.',
			);
			this.writes.push(isMut);
		}
		this.filters = filters;
	}

	isLocalToThread() {
		return false;
	}

	intersectsWith(other: unknown) {
		return other instanceof QueryDescriptor
			? this.components.some((compA, iA) =>
					other.components.some(
						(compB, iB) =>
							compA === compB &&
							(this.writes[iA] || other.writes[iB]),
					),
			  )
			: false;
	}

	onAddSystem(builder: WorldBuilder) {
		this.components.forEach(comp => builder.registerComponent(comp));
		this.#addFilters(this.filters, builder);
	}

	intoArgument(world: World): Query<
		{
			[Index in keyof A]: A[Index] extends Class
				? InstanceType<A[Index]>
				: A[Index];
		},
		F
	> {
		const query = new Query(
			...createFilter(world.components, this.components, this.filters),
			this.components,
			world.commands,
		);
		world.queries.push(query);
		return query as any;
	}

	#addFilters(filters: Filter, builder: WorldBuilder) {
		[filters].flat().forEach(f => {
			if (f instanceof With || f instanceof Without) {
				[f.value]
					.flat()
					.forEach(comp => builder.registerComponent(comp));
			} else if (f instanceof Or) {
				this.#addFilters(f.l, builder);
				this.#addFilters(f.r, builder);
			}
		});
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect, describe, vi } = import.meta.vitest;
	const { struct } = await import('../../struct');

	class Comp {
		declare static size: number;
		declare static schema: number;
	}
	@struct()
	class A extends Comp {
		@struct.f32() declare value: number;
	}
	@struct()
	class B extends Comp {
		@struct.i64() declare value: bigint;
	}

	@struct()
	class C extends Comp {
		@struct.u8() declare value: number;
	}
	@struct()
	class D extends Comp {
		@struct.u8() declare value: number;
	}

	it('throws if trying to access ZSTs', () => {
		class ZST {
			static size = 0;
		}
		expect(() => new QueryDescriptor([ZST])).toThrow(
			/may not request direct access to ZSTs/,
		);
	});

	describe('intersectsWith', () => {
		it('returns false for queries that do not overlap', () => {
			const queryAB = new QueryDescriptor([A, B]);
			const queryCD = new QueryDescriptor([C, D]);
			expect(queryAB.intersectsWith(queryCD)).toBe(false);

			const queryABMut = new QueryDescriptor([new Mut(A), new Mut(B)]);
			const queryCDMut = new QueryDescriptor([new Mut(C), new Mut(D)]);
			expect(queryABMut.intersectsWith(queryCDMut)).toBe(false);
		});

		it('returns false for queries that readonly overlap', () => {
			const queryAB1 = new QueryDescriptor([A, B]);
			const queryAB2 = new QueryDescriptor([A, B]);

			expect(queryAB1.intersectsWith(queryAB2)).toBe(false);
		});

		it('returns true for queries that read/write overlap', () => {
			const query1 = new QueryDescriptor([new Mut(A), B]);
			const query2 = new QueryDescriptor([A, D]);
			const query3 = new QueryDescriptor([C, new Mut(B)]);
			expect(query1.intersectsWith(query2)).toBe(true);
			expect(query1.intersectsWith(query3)).toBe(true);
		});

		it('returns false for non-QueryDescriptors', () => {
			expect(new QueryDescriptor([]).intersectsWith({})).toBe(false);
		});
	});

	describe('onAddSystem', () => {
		it('registers all components and the query', () => {
			const registerComponent = vi.fn();
			const builder: WorldBuilder = {
				registerComponent,
			} as any;

			const descriptor = new QueryDescriptor([
				A,
				new Mut(B),
				new Mut(C),
				D,
			]);
			descriptor.onAddSystem(builder);

			expect(registerComponent).toHaveBeenCalledTimes(4);
			expect(registerComponent).toHaveBeenCalledWith(A);
			expect(registerComponent).toHaveBeenCalledWith(B);
			expect(registerComponent).toHaveBeenCalledWith(C);
			expect(registerComponent).toHaveBeenCalledWith(D);
		});

		it('registers filter components', () => {
			const registerComponent = vi.fn();
			const builder: WorldBuilder = {
				registerComponent,
			} as any;
			const descriptor = new QueryDescriptor(
				[A],
				new Or(new With(B), new Without(C)),
			);
			descriptor.onAddSystem(builder);

			expect(registerComponent).toHaveBeenCalledTimes(3);
			expect(registerComponent).toHaveBeenCalledWith(A);
			expect(registerComponent).toHaveBeenCalledWith(B);
			expect(registerComponent).toHaveBeenCalledWith(C);
		});
	});

	describe('isLocalToThread', () => {
		it('returns false', () => {
			expect(new QueryDescriptor([A, B, C]).isLocalToThread()).toBe(
				false,
			);
			expect(
				new QueryDescriptor([
					new Mut(A),
					new Mut(B),
					new Mut(C),
				]).isLocalToThread(),
			).toBe(false);
		});
	});

	describe('intoArgument', () => {
		it('returns a query', () => {
			const descriptor = new QueryDescriptor([A, B]);
			const world: any = {
				components: [A, B],
				queries: [],
			};

			const result = descriptor.intoArgument(world);
			expect(result).toBeInstanceOf(Query);
			expect(world.queries).toContain(result);
		});
	});
}
