import { DataSource } from 'typeorm';

export const DEFAULT_DATASOURCE_NAME = 'default';

export class DataSourceStorage {
  private static readonly dataSourceStore = new Map<string, DataSource>();

  static getDataSource(name: string = DEFAULT_DATASOURCE_NAME): DataSource {
    return this.dataSourceStore.get(name);
  }

  static setDataSource(name: string, dataSource: DataSource): void {
    this.dataSourceStore.set(name, dataSource);
  }
}
