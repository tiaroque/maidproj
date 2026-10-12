import { UserDetailsObject } from './user.interface';

export interface Metadata {
  count: number;
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

export interface ListPaging {
  metadata: Metadata;
  data: Array<UserDetailsObject>;
}
