import { EntitySchema } from 'typeorm';
import { Provider } from '@nestjs/common';
import { TransactionalRepository } from '../transactional.repository';
import {
  DEFAULT_DATASOURCE_NAME,
  DataSourceStorage,
} from './datasource-storage';

/** Retrieves repository injection token */
export function getRepositoryInjectionToken(
  entity: Function | EntitySchema<any>,
) {
  const name = entity instanceof Function ? entity.name : entity.options.name;
  return `${name}_TransactionalRepository`;
}

/** Retrieves data source injection token */
export function getDataSourceInjectionToken(
  dataSource: string = DEFAULT_DATASOURCE_NAME,
) {
  return `${dataSource}_TransactionalDataSource`;
}

/** Creates providers for all entities */
export function createProviders(
  entities: Array<Function | EntitySchema<any>>,
  ds: string = DEFAULT_DATASOURCE_NAME,
): Provider[] {
  return entities.map((entity) => {
    return {
      useFactory: () => {
        const dataSource = DataSourceStorage.getDataSource(ds);
        return new TransactionalRepository(dataSource, entity, ds);
      },
      provide: getRepositoryInjectionToken(entity),
    };
  });
}
