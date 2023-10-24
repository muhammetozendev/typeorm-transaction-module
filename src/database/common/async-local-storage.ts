import { AsyncLocalStorage } from 'async_hooks';
import { IAsyncLocalStore } from '../types/async-local-store';

export const asyncLocalStorage = new AsyncLocalStorage<IAsyncLocalStore>();
