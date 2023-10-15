import { EntityClassOrSchema } from '@nestjs/typeorm/dist/interfaces/entity-class-or-schema.type';
import { AsyncLocalStorage } from 'async_hooks';
import { DataSource } from 'typeorm';
import { IAsyncLocalStore } from '../types/async-local-store';
import { Provider } from '@nestjs/common';
import { TransactionalRepository } from '../transactional.repository';

export function createInjectionToken(entity: EntityClassOrSchema) {
  const name = entity instanceof Function ? entity.name : entity.options.name;
  return `${name}_TransactionalRepository`;
}

export function createProviders(entities: EntityClassOrSchema[]): Provider[] {
  return entities.map((entity) => {
    return {
      useFactory: (
        dataSource: DataSource,
        als: AsyncLocalStorage<IAsyncLocalStore>,
      ) => {
        return new TransactionalRepository(dataSource, als, entity);
      },
      inject: [DataSource, AsyncLocalStorage],
      provide: createInjectionToken(entity),
    };
  });
}
