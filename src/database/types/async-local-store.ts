import { EntityManager } from 'typeorm';

export interface IAsyncLocalStore {
  manager: EntityManager;
}
