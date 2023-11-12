import {
  DataSource,
  DeepPartial,
  EntityManager,
  EntitySchema,
  FindManyOptions,
  FindOneOptions,
  FindOptionsWhere,
  ObjectId,
  ObjectLiteral,
  QueryRunner,
  Repository,
  SaveOptions,
} from 'typeorm';
import { IPagination } from './types/pagination';
import {
  DEFAULT_DATASOURCE_NAME,
  DataSourceStorage,
} from './common/datasource-storage';
import { asyncLocalStorage as als } from './common/async-local-storage';
import { PickKeysByType } from 'typeorm/common/PickKeysByType';
import { UpsertOptions } from 'typeorm/repository/UpsertOptions';

type IdType =
  | number
  | string
  | ObjectId
  | Date
  | number[]
  | string[]
  | ObjectId[]
  | Date[];

export class TransactionalRepository<T extends ObjectLiteral> {
  constructor(
    private dataSource: DataSource,
    private EntityClass: Function | EntitySchema<any>,
    private connection: string = DEFAULT_DATASOURCE_NAME,
  ) {}

  /** Execute a raw query */
  static async executeRawQuery<Raw = any>(options: {
    /** Query to execute */
    query: string;
    /** Parameters of the query */
    parameters?: any[];
    /** Name of the connection */
    connection?: string;
  }) {
    let manager: EntityManager;
    const connection = options.connection ?? DEFAULT_DATASOURCE_NAME;
    if (als.getStore() && als.getStore()[connection]) {
      manager = als.getStore()[connection];
    } else {
      manager = DataSourceStorage.getDataSource(connection).manager;
    }
    return await manager.query<Raw>(options.query, options.parameters);
  }

  /** Retrieve the transactional entity manager optionally specifying a connection name. If no connection name is specified, the default connection's entity manager is returned */
  static getEntityManager(connection: string = DEFAULT_DATASOURCE_NAME) {
    let manager: EntityManager;
    if (als.getStore() && als.getStore()[connection]) {
      manager = als.getStore()[connection];
    } else {
      manager = DataSourceStorage.getDataSource(connection).manager;
    }
    return manager;
  }

  /** Get native typeorm repository */
  getTypeOrmRepository(): Repository<T> {
    let manager: EntityManager;
    if (als.getStore() && als.getStore()[this.connection]) {
      manager = als.getStore()[this.connection];
    } else {
      manager = this.dataSource.manager;
    }
    return manager.getRepository(this.EntityClass);
  }

  /** Create query builder */
  createQueryBuilder(alias?: string, queryRunner?: QueryRunner) {
    return this.getTypeOrmRepository().createQueryBuilder(alias, queryRunner);
  }

  /** Return multiple records */
  async find(options?: FindManyOptions<T>) {
    return await this.getTypeOrmRepository()
      .createQueryBuilder()
      .setFindOptions(options ?? {})
      .getMany();
  }

  /** Return multiple records */
  async findBy(where: FindOptionsWhere<T> | FindOptionsWhere<T>[]) {
    return await this.find({
      where,
    });
  }

  /** Return multiple records with pagination */
  async findWithPagination(
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

  /** Find one record */
  async findOne(options: FindOneOptions<T>) {
    return await this.getTypeOrmRepository()
      .createQueryBuilder()
      .setFindOptions(options)
      .getOne();
  }

  /** Find one record */
  async findOneBy(where: FindOptionsWhere<T> | FindOptionsWhere<T>[]) {
    return await this.findOne({
      where,
    });
  }

  /** Preload an entity using typeorm preload method */
  async preload(entity: DeepPartial<T>): Promise<T> {
    return await this.getTypeOrmRepository().preload(entity);
  }

  /** Insert record(s). Unlike save, it attempts to insert without checking if entity exists and ingores cascades */
  async insert(entity: DeepPartial<T>): Promise<T>;
  async insert(entity: DeepPartial<T>[]): Promise<T[]>;
  async insert(
    entity: DeepPartial<T> | Array<DeepPartial<T>>,
  ): Promise<T | T[]> {
    if (entity instanceof Array) {
      await this.getTypeOrmRepository().insert(entity);
      return entity as T[];
    } else {
      await this.getTypeOrmRepository().insert(entity);
      return entity as T;
    }
  }

  /** Creates entity/entities without saving them in DB */
  create(entity: DeepPartial<T>): T;
  create(entity: DeepPartial<T>[]): T[];
  create(entity: DeepPartial<T> | DeepPartial<T>[]): T | T[] {
    if (entity instanceof Array) {
      return this.getTypeOrmRepository().create(entity);
    } else {
      return this.getTypeOrmRepository().create(entity);
    }
  }

  /** Calls TypeOrm save() method */
  async save(entity: DeepPartial<T>[], saveOptions?: SaveOptions): Promise<T[]>;
  async save(entity: DeepPartial<T>, saveOptions?: SaveOptions): Promise<T>;
  async save(
    entity: DeepPartial<T> | Array<DeepPartial<T>>,
    saveOptions?: SaveOptions,
  ) {
    if (!saveOptions) {
      saveOptions = { transaction: false };
    } else {
      saveOptions.transaction = false;
    }
    if (entity instanceof Array) {
      return await this.getTypeOrmRepository().save(entity, saveOptions);
    } else {
      return await this.getTypeOrmRepository().save(entity, saveOptions);
    }
  }

  /** Updates given entity/entities */
  async update(id: IdType | FindOptionsWhere<T>, entity: DeepPartial<T>) {
    await this.getTypeOrmRepository().update(id, entity);
  }

  /** Upserts record(s) */
  async upsert(
    entity: DeepPartial<T> | DeepPartial<T>[],
    conflictPaths: string[] | UpsertOptions<T>,
  ) {
    await this.getTypeOrmRepository().upsert(entity, conflictPaths);
  }

  /** Deletes record(s) */
  async delete(id: IdType | FindOptionsWhere<T>) {
    await this.getTypeOrmRepository().delete(id);
  }

  /** Disassociate all child entities in many to many relationships */
  async disassociateAll(entityId: IdType, relation: keyof T) {
    const relations = this.getTypeOrmRepository().metadata.relations;
    let found = false;
    let columnName = '';
    for (let r of relations) {
      if (r.propertyName === relation.toString()) {
        if (!r.isManyToMany || !r.junctionEntityMetadata) {
          throw new Error(
            'Not a many to many relationship or no junction metadata found',
          );
        }

        r.junctionEntityMetadata.columns.forEach((column) => {
          if (column.referencedColumn.target === this.EntityClass) {
            columnName = column.databaseName;
          }
        });

        if (!columnName) {
          throw new Error(
            'No column found in junction table for the given entity',
          );
        }

        await this.getTypeOrmRepository()
          .createQueryBuilder()
          .delete()
          .from(r.joinTableName)
          .where(`${columnName} = :id`, {
            id: entityId,
          })
          .execute();
        found = true;
      }
    }
    if (!found) {
      throw new Error(
        `Relation ${relation.toString()} not found in ${
          this.EntityClass instanceof Function
            ? this.EntityClass.name
            : this.EntityClass.options.name
        }`,
      );
    }
  }

  /** Disassociate child entities by ids in many to many relationships */
  async disassociate(
    entityId: IdType,
    relatedEntityId: IdType,
    relation: keyof T,
  ) {
    const relations = this.getTypeOrmRepository().metadata.relations;
    let found = false;
    for (let r of relations)
      if (r.propertyName === relation.toString()) {
        if (!r.isManyToMany) {
          throw new Error('Not a many to many relationship');
        }
        await this.getTypeOrmRepository()
          .createQueryBuilder()
          .relation(this.EntityClass, relation.toString())
          .of(entityId)
          .remove(relatedEntityId);
        found = true;
      }
    if (!found) {
      throw new Error(
        `Relation ${relation.toString()} not found in ${
          this.EntityClass instanceof Function
            ? this.EntityClass.name
            : this.EntityClass.options.name
        }`,
      );
    }
  }

  /** Associate child entities by ids in many to many relationships */
  async associate(
    entityId: IdType,
    relatedEntityId: IdType,
    relation: keyof T,
  ) {
    const relations = this.getTypeOrmRepository().metadata.relations;
    let found = false;
    for (let r of relations)
      if (r.propertyName === relation.toString()) {
        if (!r.isManyToMany) {
          throw new Error('Not a many to many relationship');
        }
        await this.getTypeOrmRepository()
          .createQueryBuilder()
          .relation(this.EntityClass, relation.toString())
          .of(entityId)
          .add(relatedEntityId);
        found = true;
      }
    if (!found) {
      throw new Error(
        `Relation ${relation.toString()} not found in ${
          this.EntityClass instanceof Function
            ? this.EntityClass.name
            : this.EntityClass.options.name
        }`,
      );
    }
  }

  /** Count entities */
  async count(options?: FindManyOptions<T>): Promise<number> {
    return await this.getTypeOrmRepository().count(options);
  }

  /** Get the average of a culumn */
  async average(
    columnName: PickKeysByType<T, number>,
    where?: FindOptionsWhere<T> | FindOptionsWhere<T>[],
  ): Promise<number> {
    return await this.getTypeOrmRepository().average(columnName, where);
  }

  /** Get the sum of a column */
  async sum(
    columnName: PickKeysByType<T, number>,
    where?: FindOptionsWhere<T> | FindOptionsWhere<T>[],
  ): Promise<number> {
    return await this.getTypeOrmRepository().sum(columnName, where);
  }

  /** Get the max value of a column */
  async max(
    columnName: PickKeysByType<T, number>,
    where?: FindOptionsWhere<T> | FindOptionsWhere<T>[],
  ): Promise<number> {
    return await this.getTypeOrmRepository().maximum(columnName, where);
  }

  /** Get the min value of a column */
  async min(
    columnName: PickKeysByType<T, number>,
    where?: FindOptionsWhere<T> | FindOptionsWhere<T>[],
  ): Promise<number> {
    return await this.getTypeOrmRepository().minimum(columnName, where);
  }

  /** Merge multiple entity like objects into a single entity */
  merge(mergeIntoEntity: T, ...entityLikes: DeepPartial<T>[]): T {
    return this.getTypeOrmRepository().merge(mergeIntoEntity, ...entityLikes);
  }
}
