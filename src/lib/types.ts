export type Store = {
  id: string;
  name: string;
  slug: string;
  placeId: string;
  address?: string;
  scanCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateStoreInput = {
  name: string;
  placeId: string;
  address?: string;
  slug?: string;
};
