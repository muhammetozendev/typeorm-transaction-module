import {
  getDataSourceInjectionToken,
  getRepositoryInjectionToken,
} from './utils';
import {
  DEFAULT_DATASOURCE_NAME,
  DataSourceStorage,
} from './datasource-storage';
import { IAsyncLocalStore } from '../types/async-local-store';
import { asyncLocalStorage } from './async-local-storage';
import { EntitySchema } from 'typeorm';
import { Inject } from '@nestjs/common';

/**
 * This decorator wraps all queries run within the method in a transaction.
 * If the decorated method calls other methods, those queries will also run in a transaction.
 *
 * @param connection name of the connection confiured in forRoot() method
 */
export const Transactional =
  (connection: string = DEFAULT_DATASOURCE_NAME) =>
  (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    if (process.env.NODE_ENV.toUpperCase() !== 'TEST') {
      descriptor.value = async function (...args: any[]) {
        const queryRunner =
          DataSourceStorage.getDataSource(connection).createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        const store: IAsyncLocalStore = {
          [connection]: queryRunner.manager,
        };

        try {
          const result = await asyncLocalStorage.run(store, async () => {
            return await originalMethod.apply(this, args);
          });
          await queryRunner.commitTransaction();
          return result;
        } catch (error) {
          await queryRunner.rollbackTransaction();
          throw error;
        } finally {
          await queryRunner.release();
        }
      };
    }

    return descriptor;
  };

/** Injects transactional data source. It should be noted that transactional data sources do not run queries in a transaction. It was named like that due to conventional purposes */
export const InjectTransactionalDataSource = (
  dataSource: string = DEFAULT_DATASOURCE_NAME,
) => Inject(getDataSourceInjectionToken(dataSource));

/** Injects transactional repository which runs every query in a transaction if there is an active transaction */
export const InjectTransactionalRepository = (
  entity: Function | EntitySchema<any>,
) => Inject(getRepositoryInjectionToken(entity));
