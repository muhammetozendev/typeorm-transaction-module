import { DynamicModule, Module, Provider } from '@nestjs/common';
import { createProviders, getDataSourceInjectionToken } from './common/utils';
import { DataSource, EntitySchema } from 'typeorm';
import { ConnectionOptions } from './types/connection-options';
import {
  DEFAULT_DATASOURCE_NAME,
  DataSourceStorage,
} from './common/datasource-storage';

@Module({})
export class TypeOrmTransactionModule {
  static async forRoot(options: ConnectionOptions): Promise<DynamicModule> {
    const dataSource = new DataSource(options);
    await dataSource.initialize();
    DataSourceStorage.setDataSource(
      options.name ?? DEFAULT_DATASOURCE_NAME,
      dataSource
    );
    const providers: Provider[] = [
      {
        useFactory: () => dataSource,
        provide: getDataSourceInjectionToken(options.name),
      },
    ];
    return {
      module: TypeOrmTransactionModule,
      providers: providers,
      exports: providers,
      global: true,
    };
  }

  static forFeature(
    entities: Array<Function | EntitySchema<any>> = [],
    dataSource: string = DEFAULT_DATASOURCE_NAME
  ): DynamicModule {
    const providers = createProviders(entities, dataSource);
    return {
      module: TypeOrmTransactionModule,
      providers: providers,
      exports: providers,
    };
  }
}
