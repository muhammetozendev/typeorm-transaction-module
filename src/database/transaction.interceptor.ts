import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ModuleRef, Reflector } from '@nestjs/core';
import { AsyncLocalStorage } from 'async_hooks';
import { Observable, catchError, concatMap, finalize } from 'rxjs';
import { DataSource } from 'typeorm';
import { DATASOURCE_KEY } from './common/constants';
import { IAsyncLocalStore } from './types/async-local-store';
import { getDataSourceToken } from '@nestjs/typeorm';

@Injectable()
export class TransactionInterceptor implements NestInterceptor {
  constructor(
    private als: AsyncLocalStorage<IAsyncLocalStore>,
    private reflector: Reflector,
    private moduleRef: ModuleRef,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Promise<Observable<any>> {
    const dataSourceToken: string = this.reflector.getAllAndOverride(
      DATASOURCE_KEY,
      [context.getHandler(), context.getClass()],
    );
    const dataSource: DataSource = this.moduleRef.get(
      getDataSourceToken(dataSourceToken),
      { strict: false },
    );
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const store = {
      manager: queryRunner.manager,
    };

    return this.als.run(store, () => {
      return next.handle().pipe(
        concatMap(async (data) => {
          await queryRunner.commitTransaction();
          return data;
        }),
        catchError(async (e) => {
          await queryRunner.rollbackTransaction();
          throw e;
        }),
        finalize(async () => {
          await queryRunner.release();
        }),
      );
    });
  }
}
