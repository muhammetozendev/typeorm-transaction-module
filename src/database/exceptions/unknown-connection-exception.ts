import { DEFAULT_DATASOURCE_NAME } from '../common/datasource-storage';

/** An exception that is thrown when connection name is not valid */
export class UnknownConnectionException extends Error {
  constructor(connectionName: string) {
    super(
      connectionName === DEFAULT_DATASOURCE_NAME
        ? `Default connection not found`
        : `Unknown connection: ${connectionName}`,
    );
  }
}
