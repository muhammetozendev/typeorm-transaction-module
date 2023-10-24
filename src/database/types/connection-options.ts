import { DataSourceOptions, EntitySchema } from 'typeorm';

export type ConnectionOptions = DataSourceOptions & {
  name?: string;
  entities: Array<Function | EntitySchema<any>>;
};
