import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModuleOptions } from './types/database-module-options';
import { AsyncLocalStorage } from 'async_hooks';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TransactionInterceptor } from './transaction.interceptor';
import { EntityClassOrSchema } from '@nestjs/typeorm/dist/interfaces/entity-class-or-schema.type';
import { createProviders } from './common/utils';

@Module({})
export class TypeOrmTransactionModule {
  static forRoot(options: DatabaseModuleOptions): DynamicModule {
    return {
      module: TypeOrmTransactionModule,
      imports: [TypeOrmModule.forRoot(options)],
      providers: [
        {
          provide: APP_INTERCEPTOR,
          useClass: TransactionInterceptor,
        },
        {
          provide: AsyncLocalStorage,
          useValue: new AsyncLocalStorage(),
        },
      ],
      exports: [AsyncLocalStorage],
      global: true,
    };
  }

  static forFeature(
    entities: EntityClassOrSchema[] = [],
    dataSource: string = 'default',
  ): DynamicModule {
    const providers = createProviders(entities, dataSource);
    return {
      module: TypeOrmTransactionModule,
      providers: providers,
      exports: providers,
    };
  }
}
