# Description

A NestJS module to make TypeORM transaction management easier across different services.

# How it works

This package can be used to reduce the boilerplate code needed to manage TypeORM transactions. It acts as a wrapper around the actual TypeORM package that enables effortless transaction support. The package utilizes async local storage in order to share transactional entity manager accross different service method calls so that transactions across multiple services are handled behind the scenes and abstracted away from developers.

_Note: In the following code snippets, only the imports relvant to this package are shown_

# How to use it

## Importing TypeOrmTransactionModule

You should ideally import `TypeOrmTransactionModule.forRoot()` in your `app.module.ts` file and the configuration options are exactly the same as `@nestjs/typeorm` package.

Add the following to the imports array of your module:

```ts
import { TypeOrmTransactionModule } from 'nestjs-typeorm-transactions';

@Module({
  imports: [
    TypeOrmTransactionModule.forRoot({
      type: 'mysql', // or postgres, sqlite etc
      host: 'localhost',
      username: 'username',
      password: 'password',
      database: 'test',
      entities: [User], // list of entities
      synchronize: true,
      logging: true,
    }),
  ],
})
export class AppModule {}
```

For a repository to be avilable in the context of a sub module, we need to import `TypeOrmTransactionModule.forFeature()` in that module's import array. Just like `@nestjs/typeorm` package, we can pass an array of entities whose repositories will be available in this module.

```ts
import { TypeOrmTransactionModule } from 'nestjs-typeorm-transactions';

@Module({
  imports: [TypeOrmTransactionModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
```

## Injecting repositories and runnning queries in transactions

The way repositories are injected are almost the same as `@nestjs/typeorm` package. Only difference is that you need to use `@InjectTransactionalRepository`. The entity for which repository will be injected should be povided to this decorator as well.

```ts
import {
  InjectTransactionalRepository,
  TransactionalRepository,
} from 'nestjs-typeorm-transactions';

class UsersService {
  constructor(
    @InjectTransactionalRepository(User)
    private userRepository: TransactionalRepository<User>,
  ) {}

  async doSomethingWithUser() {
    // ...
  }
}
```

As seen above, the type of injected repository is `TransactionalRepository`. By default, the queries are NOT wrapped inside a transaction even if you inject TransactionalRepository into your service class. In order to run queries in a transaction, `@Transactional` decorator must be used on either the route handler or the service method that is handling the request. Here's an example:

```ts
import { Transactional } from 'nestjs-typeorm-transactions';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post('with-transaction')
  @Transactional()
  async withTransaction() {
    await this.usersService.doSomethingWithUser();
  }

  @Post('without-transaction')
  async withTransaction() {
    await this.usersService.doSomethingWithUser();
  }
}
```

If a request hits the endpoint `/users/with-transcation`, any database query executed by `doSomethingWithUser` or any other service method that
`doSomethingWithUser` method calls, all of these queries will be wrapped in a transaction as we have used `@Transactional` decorator.

However, if a request hits the other endpoint `/users/without-transcation`, no transaction will be created. So it's crucial to remember to add `@Transactional` decorator on route handlers where we need atomicity.

One thing to note here is transactional logic is recommended to be kept in service methods. Just like we can place `@Transactional` decorator on the route handler, we can also put it on the service method as well. Here's an example:

```ts
import {
  InjectTransactionalRepository,
  TransactionalRepository,
  Transactional,
} from 'nestjs-typeorm-transactions';

class UsersService {
  constructor(
    @InjectTransactionalRepository(User)
    private userRepository: TransactionalRepository<User>,
  ) {}

  @Transactional()
  async doSomethingWithUser() {
    // ...
  }
}
```

## Connecting to multiple databases

Connecting to multiple databases is supported by `@nestjs/typeorm` package and it's also supported by this package. In order to accomplish this, `TypeOrmTransactionModule.forRoot()` should be imported multiple times as follows:

```ts
import { TypeOrmTransactionModule } from 'nestjs-typeorm-transactions';

@Module({
  imports: [
    TypeOrmTransactionModule.forRoot({
      type: 'mysql',
      host: 'mysql_host',
      username: 'mysql_username',
      password: 'mysql_password',
      database: 'test_mysql',
      entities: [User],
      synchronize: true,
      logging: true,
    }),
    TypeOrmTransactionModule.forRoot({
      name: 'second_db', // name for the postgresql db connection
      type: 'postgres',
      host: 'postgres_host',
      username: 'postgres_username',
      password: 'postgres_password',
      database: 'test_postgres',
      entities: [Article],
      synchronize: true,
      logging: true,
    }),
  ],
})
export class AppModule {}
```

In this case, we have two database connections. The first one is the default one and it's the mysql database. The second connection is for a postgresql database and it's used to store the articles. The name specified for the postgresql database is `second_db` and it will be used later on.

In order to make repositories for both of these connections available in the users module's context, we import them both as follows:

```ts
import { TypeOrmTransactionModule } from 'nestjs-typeorm-transactions';

@Module({
  imports: [
    TypeOrmTransactionModule.forFeature([User]), // will use the default connection (mysql)
    TypeOrmTransactionModule.forFeature([Article], 'second_db'), // will use postgresql connection
  ],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
```

How we inject repositories remains exactly the same:

```ts
import {
  InjectTransactionalRepository,
  TransactionalRepository,
} from 'nestjs-typeorm-transactions';

class UsersService {
  constructor(
    @InjectTransactionalRepository(User)
    private userRepository: TransactionalRepository<User>,
    @InjectTransactionalRepository(Article)
    private userRepository: TransactionalRepository<Article>,
  ) {}

  @Transactional()
  async doSomethingWithUser() {
    // ...
  }

  @Transactional('second_db')
  async doSomethingWithArticle() {
    // ...
  }
}
```

And lastly, controllers must be defined:

```ts
import { Transactional } from 'nestjs-typeorm-transactions';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  async withTransaction() {
    await this.usersService.doSomethingWithUser();
  }

  @Post('/articles')
  async withTransaction() {
    await this.usersService.doSomethingWithArticle();
  }
}
```

When `@Transactional` decorator is added without any argument, it will wrap all database queries executed by the default connection in a transaction (mysql connection in this case). However, the second decorator has the argument `second_db` which means in the route `/users/articles`, only the database queries that are sent to the postgres database will be in a transaction.

## Injecting Data Sources

In order to inject the data source objects, use `@InjectTransactionalDataSource` decorator, passing data source name if needed. If it is called without any data source name, the default data source will be injected.

> It should be noted that when data source is injected, `@Transactional` decorator will not be wrapping the database operations executed by the data source in a transaction. That is because the data source object generated by typeorm directly gets injected. It was named `InjectTransactionalDataSource` for conventional purposes. In case you need to use `@Transactional` along with raw queries, use the static method `TransactionalRepository.executeRawQuery` instead as explained below.

Here's an example of how to inject the default data source:

```ts
export class SomeServiceClass {
  constructor(
    @InjectTransactionalDataSource()
    private defaultDataSource: DataSource,
  ) {}
}
```

We can also inject datasource for named connections as well (The connections where we specified name attribute in `forRoot` method):

```ts
export class SomeServiceClass {
  constructor(
    @InjectTransactionalDataSource('second_db')
    private defaultDataSource: DataSource,
  ) {}
}
```

## Running Raw Queries

There may be some times where it would be necessary to run raw queries in a transaction. In these cases, we can use the static method `TransactionalRepository.executeRawQuery`. The method takes an object with three properties. Here's the method definition:

```ts
export declare class TransactionalRepository<T extends ObjectLiteral> {
  // ....

  static executeRawQuery<T = any>(options: {
    /* Query to execute */
    query: string;

    /* Parameters / replacements of the query */
    parameters?: any[];

    /* Name of the connection */
    connection?: string;
  }): Promise<T>;

  // ....
}
```

The properties `query` and `parameters` are used to run the query and pass in the replacements to prevent potential SQL injection attacks. The last property `connection` is the name of the connection through which we want to execute the query.

This method executes a query against the target database while still being compatible with `@Transactional` decorator. It will wrap the query in a transaction when used in combination with this decorator. If `@Transactional`, the query will be run without any transaction. Here's two examples:

```ts
export class SomeService {
  @Transactional()
  async someMethod() {
    return await TransactionalRepository.executeRawQuery<any>({
      query: 'select * from some_table where id = ?',
      parameters: [10],
    });
  }
}
```

```ts
export class SomeService {
  @Transactional('second_db')
  async someMethod() {
    return await TransactionalRepository.executeRawQuery<any>({
      query: 'select * from some_table where id = ?',
      parameters: [10],
      connection: 'second_db',
    });
  }
}
```

If you specify a value for `connection` property and you want to run the query in a transaction, make sure to include that same connection name in `@Transactional` decorator as well.

# Methods for Querying

This package creates some wrapper methods to make it easier to handle crud operations and pagination. However, native typeorm repositories can also be obtained by calling `getTypeOrmRepository` from the injected `TransactionalRepository` instances.

Following is a list of defined method signatures and types in `transactional.repository.ts`:

```ts
type IdType =
  | number
  | string
  | ObjectId
  | Date
  | number[]
  | string[]
  | ObjectId[]
  | Date[];

interface IPagination<T> {
  count: number;
  pageCount: number;
  currentPage: number;
  limit: number;
  data: T[];
}

export declare class TransactionalRepository<T extends ObjectLiteral> {
  /* Execute a raw query */
  static executeRawQuery<T = any>(options: {
    /* Query to execute */
    query: string;

    /* Parameters of the query */
    parameters?: any[];

    /* Name of the connection */
    connection?: string;
  }): Promise<T>;

  /* Retrieve the transactional entity manager optionally specifying a connection name. If no connection name is specified, the default connection's entity manager is returned */
  static getEntityManager(
    connection: string = DEFAULT_DATASOURCE_NAME,
  ): EntityManager;

  /* Get native typeorm repository */
  getTypeOrmRepository(): Repository<T>;

  /* Create query builder */
  createQueryBuilder(
    alias?: string,
    queryRunner?: QueryRunner,
  ): SelectQueryBuilder<T>;

  /* Return multiple records */
  findAll(options?: FindManyOptions<T>): Promise<T[]>;

  /* Return multiple records with pagination */
  findAllWithPagination(
    limit: number,
    page: number,
    options?: FindManyOptions<T>,
  ): Promise<IPagination<T>>;

  /* Find one record */
  findOne(options: IFindOneOptions<T>): Promise<T>;

  /* Find one record */
  findOneBy(where: FindOptionsWhere<T> | FindOptionsWhere<T>[]): Promise<T>;

  /* Find an entity by primary key column, possibly caching the result for a limited amount of time */
  findOneByPK(
    id: number | string | Date,
    cacheOptions?: {
      /* Whether to expire the record from cache after the first retrieval */
      once?: boolean;
      /* Time in milliseconds for expiry ttl */
      ttl?: number;
    },
  ): Promise<T>;

  /* Calls preload() method of TypeOrm */
  async preload(entity: DeepPartial<T>): Promise<T>;

  /* Insert one record. Unlike save, it attempts to insert without checking if entity exists and ingores cascades */
  insert(entity: DeepPartial<T>): Promise<T>;

  /* Executes a single fast insert query to insert many records without cascades */
  insert(entity: DeepPartial<T>[]): Promise<T[]>;

  /* Creates entity/entities without saving them in DB */
  create(entity: DeepPartial<T>): T;
  create(entity: DeepPartial<T>[]): T[];

  /* Calls TypeOrm save() method with a single entity */
  async save(entity: DeepPartial<T>, saveOptions?: SaveOptions): Promise<T>;

  /* Calls TypeOrm save() method with an array of entities */
  async save(entity: DeepPartial<T>[], saveOptions?: SaveOptions): Promise<T[]>;

  /* Updates given entity/entities */
  update(
    id: IdType | FindOptionsWhere<T>,
    entity: DeepPartial<T>,
  ): Promise<void>;

  /* Upserts record(s) */
  upsert(
    entity: DeepPartial<T> | DeepPartial<T>[],
    conflictPaths: string[],
  ): Promise<void>;

  /* Deletes record(s) */
  delete(id: IdType | FindOptionsWhere<T>): Promise<void>;
}
```

For querying, either the provided utility methods could be used or `getTypeOrmRepository` method can be used to retrieve a typeorm repository instance which comes from the actual `typeorm` repository itself.

Another important method here is `findOneByPK` which locates entities by their primary keys, possibly caching them if `cacheOptions` property is specified. Any call to `findOneByPK` will first look up the entry in the cache. The database query will only be sent in case of a cache hit. This method is used for validating resource IDs parsed from the request URL.

# Entity ID Validation

`nestjs-typeorm-transactions` also supports means to validate path IDs. `EntityExistsPipe` can be used to ensure the resource exists before executing the route handler. In case resouce does not exist, `NotFoundException` is thrown. Here's an example usage:

```ts
@Controller('users')
export class UsersConroller {
  @Get(':id')
  findOne(
    @Param('id', EntityExistsPipe(User))
    id: string,
  ) {
    return this.usersService.findOne(+id);
  }
}
```

`EntityExistsPipe` accepts 2 arguments. The first one is the entity class whose id is being validated. Second argument is optional and specifies caching configuration. Here's the method signature for arguments:

```ts
function EntityExistsPipe<T>(
  EntityClass: Function | EntitySchema<T>,
  cacheOptions?: {
    /* Time in milliseconds for expiry */
    ttl?: number;

    /* Whether to expire the record from cache after the first retrieval */
    once?: boolean;
  },
);
```

As can be seen above, we can supply `ttl` and `once` properties to configure caching behavior. `ttl` sets the duration in milliseconds that specifies how long record will stay in cache. And if `once` is set to true, the record will expire after the initial retrieval. The default values for `ttl` is 5000 and for `once` is true.

In addition, we need to prevent sending the same SELECT query to DB twice both for validation (`EntityExistsPipe` would send one query for validating the id) and querying the resource again inside the route handler where the resource might be needed for further processing. `EntityExistsPipe` will save the queried resource in the cache and it can be retrieved from the cache later to avoid duplicate querying. The reason `once` is true by default is because after we retrieve the record from the cache in route handler, it will no longer be needed and therefore removed from cache. But that behavior can be disabled by setting `once` to false as below:

```ts
@Controller('users')
export class UsersConroller {
  @Get(':id')
  findOne(
    @Param('id', EntityExistsPipe(User, { once: false }))
    id: string,
  ) {
    return this.usersService.findOne(+id);
  }
}
```

It should also be noted that in order to prevent duplicate queries from being sent to the DB as explained above, `findOneByPK` method must be used in route handler/service methods as `findOneByPK` first looks up the cache for the record before querying the database.
