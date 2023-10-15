import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AsyncLocalStorage } from 'async_hooks';
import { Observable, catchError, concatMap, finalize, throwError } from 'rxjs';
import { DataSource } from 'typeorm';
import { TRANSACTIONAL_KEY } from './common/constants';
import { IAsyncLocalStore } from './types/async-local-store';

@Injectable()
export class TransactionInterceptor implements NestInterceptor {
  constructor(
    private dataSource: DataSource,
    private als: AsyncLocalStorage<IAsyncLocalStore>,
    private reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Promise<Observable<any>> {
    const metadata = this.reflector.getAllAndOverride(TRANSACTIONAL_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!metadata) {
      return next.handle();
    }
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const store = {
      manager: queryRunner.manager,
    };

    return this.als.run(store, () => {
      return next.handle().pipe(
        concatMap(async (data) => {
          console.log('Comitting');
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
