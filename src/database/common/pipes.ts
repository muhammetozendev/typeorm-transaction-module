import {
  ArgumentMetadata,
  Injectable,
  NotFoundException,
  PipeTransform,
} from '@nestjs/common';
import { InjectTransactionalRepository } from './decorators';
import { TransactionalRepository } from '../transactional.repository';
import { EntitySchema } from 'typeorm';

export function EntityExistsPipe<T>(
  EntityClass: Function | EntitySchema<T>,
  cacheOptions?: {
    /** Number of milliseconds to keep the found record in the cache */
    ttl?: number;
    /** Whether to expire the record after first retrieval */
    once?: boolean;
  },
) {
  @Injectable()
  class EntityExistsPipeCls implements PipeTransform {
    constructor(
      @InjectTransactionalRepository(EntityClass)
      public repository: TransactionalRepository<any>,
    ) {}

    async transform(value: any, metadata: ArgumentMetadata) {
      const entity = await this.repository.findOneByPK(value, {
        once: cacheOptions?.once ?? true,
        ttl: cacheOptions?.ttl ?? 5000,
      });
      const name =
        EntityClass instanceof Function
          ? EntityClass.name
          : EntityClass.options.name;

      if (!entity) {
        throw new NotFoundException(`${name} with id ${value} not found`);
      }
      return value;
    }
  }
  return EntityExistsPipeCls;
}
