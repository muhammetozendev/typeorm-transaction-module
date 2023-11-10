import { DataSource } from 'typeorm';
import { UnknownConnectionException } from '../exceptions/unknown-connection-exception';

export const DEFAULT_DATASOURCE_NAME = 'default';

/** Stores all data sources */
export class DataSourceStorage {
  private static readonly dataSourceStore = new Map<string, DataSource>();

  static getDataSource(name: string = DEFAULT_DATASOURCE_NAME): DataSource {
    const dataSource = this.dataSourceStore.get(name);
    if (!dataSource) {
      throw new UnknownConnectionException(name);
    }
    return dataSource;
  }

  static setDataSource(name: string, dataSource: DataSource): void {
    this.dataSourceStore.set(name, dataSource);
  }
}
