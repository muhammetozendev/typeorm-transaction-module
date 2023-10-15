import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { EntitySchema } from 'typeorm';

export type DatabaseModuleOptions = TypeOrmModuleOptions & {
  entities: Array<string | Function | EntitySchema<any>>;
};
