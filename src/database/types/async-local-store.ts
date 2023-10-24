import { EntityManager } from 'typeorm';

export interface IAsyncLocalStore {
  [key: string]: EntityManager;
}
