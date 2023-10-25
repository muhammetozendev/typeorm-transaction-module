import {
  DataSource,
  DeepPartial,
  EntityManager,
  EntitySchema,
  FindManyOptions,
  FindOneOptions,
  FindOptionsRelations,
  FindOptionsWhere,
  ObjectLiteral,
  Repository,
} from 'typeorm';
import { AsyncLocalStorage } from 'async_hooks';
import { IAsyncLocalStore } from './types/async-local-store';
import { IPagination } from './types/pagination';
import { DEFAULT_DATASOURCE_NAME } from './common/datasource-storage';

type IdType = number | string | number[] | string[];

export interface IFindOneOptions<T> extends FindOneOptions<T> {
  relations?: FindOptionsRelations<T>;
}

export class TransactionalRepository<T extends ObjectLiteral> {
  constructor(
    private dataSource: DataSource,
    private als: AsyncLocalStorage<IAsyncLocalStore>,
    private EntityClass: Function | EntitySchema<any>,
    private connection: string = DEFAULT_DATASOURCE_NAME,
  ) {}

  getTypeOrmRepository(): Repository<T> {
    let manager: EntityManager;
    if (this.als.getStore() && this.als.getStore()[this.connection]) {
      manager = this.als.getStore()[this.connection];
    } else {
      manager = this.dataSource.manager;
    }
    return manager.getRepository(this.EntityClass);
  }

  createQueryBuilder() {
    return this.getTypeOrmRepository().createQueryBuilder();
  }

  async findAll(options?: FindManyOptions<T>) {
    return await this.getTypeOrmRepository()
      .createQueryBuilder()
      .setFindOptions(options ?? {})
      .getMany();
  }

  async findAllWithPagination(
    limit: number,
    page: number,
    options?: FindManyOptions<T>,
  ): Promise<IPagination<T>> {
    const data = await this.getTypeOrmRepository()
      .createQueryBuilder()
      .setFindOptions(options ?? {})
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const count = await this.getTypeOrmRepository()
      .createQueryBuilder()
      .setFindOptions(options ?? {})
      .getCount();

    return {
      count,
      pageCount: Math.ceil(count / limit),
      currentPage: page,
      limit,
      data,
    };
  }

  async findOne(options: IFindOneOptions<T>) {
    return await this.getTypeOrmRepository()
      .createQueryBuilder()
      .setFindOptions(options)
      .getOne();
  }

  async findOneBy(where: FindOptionsWhere<T> | FindOptionsWhere<T>[]) {
    return await this.getTypeOrmRepository()
      .createQueryBuilder()
      .setFindOptions({
        where,
      })
      .getOne();
  }

  async create(entity: DeepPartial<T>): Promise<T> {
    await this.getTypeOrmRepository().insert(entity);
    return entity as T;
  }

  async createMany(entity: Array<DeepPartial<T>>): Promise<T[]> {
    await this.getTypeOrmRepository().insert(entity);
    return entity as T[];
  }

  async update(id: IdType | FindOptionsWhere<T>, entity: DeepPartial<T>) {
    await this.getTypeOrmRepository().update(id, entity);
  }

  async upsert(entity: DeepPartial<T>, conflictPaths: string[]) {
    await this.getTypeOrmRepository().upsert(entity, conflictPaths);
  }

  async upsertMany(entities: Array<DeepPartial<T>>, conflictPaths: string[]) {
    await this.getTypeOrmRepository().upsert(entities, conflictPaths);
  }

  async delete(id: IdType | FindOptionsWhere<T>) {
    await this.getTypeOrmRepository().delete(id);
  }
}
