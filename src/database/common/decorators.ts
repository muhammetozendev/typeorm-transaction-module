import { Inject } from '@nestjs/common';
import { createInjectionToken } from './utils';
import {
  DEFAULT_DATASOURCE_NAME,
  DataSourceStorage,
} from './datasource-storage';
import { IAsyncLocalStore } from '../types/async-local-store';
import { asyncLocalStorage } from './async-local-storage';
import { EntitySchema } from 'typeorm';

export const Transactional =
  (connection: string = DEFAULT_DATASOURCE_NAME) =>
  (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const queryRunner =
        DataSourceStorage.getDataSource(connection).createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const store: IAsyncLocalStore = {
        [connection]: queryRunner.manager,
      };

      try {
        await asyncLocalStorage.run(store, async () => {
          return await originalMethod.apply(this, args);
        });
        await queryRunner.commitTransaction();
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    };

    return descriptor;
  };

export const InjectTransactionalRepository = (
  entity: Function | EntitySchema<any>
) => Inject(createInjectionToken(entity));
