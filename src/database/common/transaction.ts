import { IAsyncLocalStore } from '../types/async-local-store';
import { asyncLocalStorage } from './async-local-storage';
import {
  DEFAULT_DATASOURCE_NAME,
  DataSourceStorage,
} from './datasource-storage';

/** Runs the callback within a transaction. Any subsequent calls will also run queries in a transaction */
export const transaction = async <T>(
  cb: () => Promise<T>,
  connection: string = DEFAULT_DATASOURCE_NAME,
) => {
  const queryRunner =
    DataSourceStorage.getDataSource(connection).createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  const store: IAsyncLocalStore = {
    [connection]: queryRunner.manager,
  };

  try {
    const result = await asyncLocalStorage.run(store, async () => {
      return await cb();
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
