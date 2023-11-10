import { AsyncLocalStorage } from 'async_hooks';
import { IAsyncLocalStore } from '../types/async-local-store';

/** Async local storage that is used to share the transactional entity manager across different method calls */
export const asyncLocalStorage = new AsyncLocalStorage<IAsyncLocalStore>();
