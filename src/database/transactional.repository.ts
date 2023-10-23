import {
  DataSource,
  DeepPartial,
  EntityManager,
  FindManyOptions,
  FindOneOptions,
  FindOptionsRelations,
  FindOptionsWhere,
  ObjectLiteral,
  Repository,
} from 'typeorm';
import { AsyncLocalStorage } from 'async_hooks';
import { IAsyncLocalStore } from './types/async-local-store';
import { EntityClassOrSchema } from '@nestjs/typeorm/dist/interfaces/entity-class-or-schema.type';
import { IPagination } from './types/pagination';

type IdType = number | string | number[] | string[];

export interface IFindOneOptions<T> extends FindOneOptions<T> {
  relations?: FindOptionsRelations<T>;
}

export class TransactionalRepository<T extends ObjectLiteral> {
  constructor(
    private dataSource: DataSource,
    private als: AsyncLocalStorage<IAsyncLocalStore>,
    private EntityClass: EntityClassOrSchema,
  ) {}

  getTypeormRepository(): Repository<T> {
    const manager: EntityManager =
      this.als.getStore()?.manager ?? this.dataSource.manager;
    return manager.getRepository(this.EntityClass);
  }

  async findAll(options?: FindManyOptions<T>) {
    return await this.getTypeormRepository()
      .createQueryBuilder()
      .setFindOptions(options ?? {})
      .getMany();
  }

  async findAllWithPagination(
    limit: number,
    page: number,
    options?: FindManyOptions<T>,
  ): Promise<IPagination<T>> {
    const data = await this.getTypeormRepository()
      .createQueryBuilder()
      .setFindOptions(options ?? {})
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const count = await this.getTypeormRepository()
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
    return await this.getTypeormRepository()
      .createQueryBuilder()
      .setFindOptions(options)
      .getOne();
  }

  async findOneBy(where: FindOptionsWhere<T> | FindOptionsWhere<T>[]) {
    return await this.getTypeormRepository()
      .createQueryBuilder()
      .setFindOptions({
        where,
      })
      .getOne();
  }

  async create(entity: DeepPartial<T>): Promise<T> {
    await this.getTypeormRepository().insert(entity);
    return entity as T;
  }

  async createMany(entity: Array<DeepPartial<T>>): Promise<T[]> {
    await this.getTypeormRepository().insert(entity);
    return entity as T[];
  }

  async update(id: IdType | FindOptionsWhere<T>, entity: DeepPartial<T>) {
    await this.getTypeormRepository().update(id, entity);
  }

  async upsert(entity: DeepPartial<T>, conflictPaths: string[]) {
    await this.getTypeormRepository().upsert(entity, conflictPaths);
  }

  async upsertMany(entities: Array<DeepPartial<T>>, conflictPaths: string[]) {
    await this.getTypeormRepository().upsert(entities, conflictPaths);
  }

  async delete(id: IdType | FindOptionsWhere<T>) {
    await this.getTypeormRepository().delete(id);
  }

  async executeRawQuery(query: string, params?: any[]) {
    return this.dataSource.query(query, params);
  }
}
