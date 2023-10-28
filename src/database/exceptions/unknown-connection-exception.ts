import { DEFAULT_DATASOURCE_NAME } from '../common/datasource-storage';

export class UnknownConnectionException extends Error {
  constructor(connectionName: string) {
    super(
      connectionName === DEFAULT_DATASOURCE_NAME
        ? `Default connection not found`
        : `Unknown connection: ${connectionName}`
    );
  }
}
