import {
  Inject,
  SetMetadata,
  UseInterceptors,
  applyDecorators,
} from '@nestjs/common';
import { createInjectionToken } from './utils';
import { EntityClassOrSchema } from '@nestjs/typeorm/dist/interfaces/entity-class-or-schema.type';
import { TransactionInterceptor } from '../transaction.interceptor';
import { DATASOURCE_KEY } from './constants';

export const Transactional = (token: string = 'default') =>
  applyDecorators(
    SetMetadata(DATASOURCE_KEY, token),
    UseInterceptors(TransactionInterceptor),
  );

export const InjectTransactionalRepository = (entity: EntityClassOrSchema) =>
  Inject(createInjectionToken(entity));
