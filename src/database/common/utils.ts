import { EntitySchema } from 'typeorm';
import { Provider } from '@nestjs/common';
import { TransactionalRepository } from '../transactional.repository';
import { asyncLocalStorage as als } from './async-local-storage';
import {
  DEFAULT_DATASOURCE_NAME,
  DataSourceStorage,
} from './datasource-storage';

export function createInjectionToken(entity: Function | EntitySchema<any>) {
  const name = entity instanceof Function ? entity.name : entity.options.name;
  return `${name}_TransactionalRepository`;
}

export function createProviders(
  entities: Array<Function | EntitySchema<any>>,
  ds: string = DEFAULT_DATASOURCE_NAME
): Provider[] {
  return entities.map((entity) => {
    return {
      useFactory: () => {
        const dataSource = DataSourceStorage.getDataSource(ds);
        return new TransactionalRepository(dataSource, als, entity, ds);
      },
      provide: createInjectionToken(entity),
    };
  });
}
