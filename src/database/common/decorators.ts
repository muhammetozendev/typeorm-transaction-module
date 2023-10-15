import { Inject, SetMetadata } from '@nestjs/common';
import { TRANSACTIONAL_KEY } from './constants';
import { createInjectionToken } from './utils';
import { EntityClassOrSchema } from '@nestjs/typeorm/dist/interfaces/entity-class-or-schema.type';

export const Transactional = () => SetMetadata(TRANSACTIONAL_KEY, true);

export const InjectTransactionalRepository = (entity: EntityClassOrSchema) =>
  Inject(createInjectionToken(entity));
