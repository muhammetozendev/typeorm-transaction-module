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

# Methods for querying

This package creates some wrapper methods to make it easier to handle crud operations and pagination. However, native typeorm repositories can also be obtained by calling `getTypeOrmRepository` from the injected `TransactionalRepository` instances.

Following is a list of defined method signatures in this package:

```ts
export declare class TransactionalRepository<T extends ObjectLiteral> {
  /* Get native typeorm repository */
  getTypeOrmRepository(): Repository<T>;

  /* Create query builder */
  createQueryBuilder(): SelectQueryBuilder<T>;

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

  /* Create one record. Unlike save, it attempts to insert without checking if entity exists */
  create(entity: DeepPartial<T>): Promise<T>;

  /* Executes a single fast insert query */
  createMany(entity: Array<DeepPartial<T>>): Promise<T[]>;

  /* Updates an entity */
  update(
    id: IdType | FindOptionsWhere<T>,
    entity: DeepPartial<T>,
  ): Promise<void>;

  /* Upserts a record */
  upsert(entity: DeepPartial<T>, conflictPaths: string[]): Promise<void>;

  /* Upserts many records */
  upsertMany(
    entities: Array<DeepPartial<T>>,
    conflictPaths: string[],
  ): Promise<void>;

  /* Deletes record(s) */
  delete(id: IdType | FindOptionsWhere<T>): Promise<void>;
}
```

For querying, either the provided utility methods could be used or `getTypeOrmRepository` method can be used to retrieve a typeorm repository instance which comes from the actual `typeorm` repository itself.
