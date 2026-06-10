/** PoolTimeout type to use for stopPool. */
export type PoolTimeout = {};

export class Pool {
    total: number;
    refill_rate: number;
    __started: boolean;
    __available: number;
    __timeout?: PoolTimeout;

    constructor(total: number, refill_rate: number, available: number = 0) {
        this.total = total;
        this.refill_rate = refill_rate;
        this.__started = false;
        this.__available = Math.min(available, total);
    }
}

export const GLOBAL_FETCH_POOL = new Pool(30, 30, 30);

/** Start a pool filling interval. */
export function startPool(
    pool: Pool = GLOBAL_FETCH_POOL,
    startAmnt: number | undefined = undefined,
): Pool {
    if (pool.__started) {
        return pool;
    }
    pool.__started = true;
    if (startAmnt !== undefined) {
        pool.__available = Math.min(startAmnt, pool.total);
    }
    const internal = () => {
        pool.__available = Math.min(
            pool.__available + pool.refill_rate / 2,
            pool.total,
        );
    };
    const timeout = setInterval(internal, 1000 / 2) as unknown as PoolTimeout;
    pool.__timeout = timeout;
    return pool;
}

/** Stop the pool filling. */
export function stopPool(pool: Pool) {
    pool.__started = false;
    return clearInterval(pool.__timeout as unknown as any);
}

function uncheckedFetch(
    resource: string | URL | Request,
    init: RequestInit,
    pool: Pool = GLOBAL_FETCH_POOL,
): Promise<Response> {
    pool.__available--;
    return fetch(resource, init);
}

function pollAvailable(pool: Pool = GLOBAL_FETCH_POOL, timeout?: number) {
    const startTime = performance.now();
    const internal = (prevResolve: any, prevReject: any) => {
        if (pool.__available >= 1) {
            return prevResolve(undefined);
        }
        if (timeout && performance.now() > startTime + timeout) {
            return prevReject(
                new Error("fetchPool: Timeout occurred during fetch polling"),
            );
        }
        setTimeout(() => {
            internal(prevResolve, prevReject);
        }, 1000 / 4);
    };
    return new Promise<void>((resolve, reject) => {
        internal(resolve, reject);
    });
}

/** Fetch from a given pool. Used for rate limiting.
 *
 * @param resource: Resource path to gather.
 * @param init: RequestInit to forward to fetch.
 * @param timeout: Timeout after which to kill the fetch attempt.
 * @param pool: Pool to pull from (defaults to global fetch pool).
 */
export async function fetchPool(
    resource: string | URL | Request,
    init: RequestInit,
    timeout?: number,
    pool: Pool = GLOBAL_FETCH_POOL,
): Promise<Response> {
    if (!pool.__started) {
        throw new Error("Pool not started, did you run `startPool` first?");
    }
    if (pool.__available >= 1) {
        return uncheckedFetch(resource, init, pool);
    } else {
        await pollAvailable(pool, timeout);
        return uncheckedFetch(resource, init, pool);
    }
}
