export interface IPagination<T> {
  count: number;
  pageCount: number;
  currentPage: number;
  limit: number;
  data: T[];
}
