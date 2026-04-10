export type PostType = 'poem' | 'essay' | 'short';

export type PostRenderImages = {
  primaryImage: string;
  images: string[];
  hasMultiple: boolean;
  pageCount: number;
  pageCap: number;
  isTruncated: boolean;
  template?: string;
  scale?: number;
  version?: string;
};

export type Post = {
  id: string;
  type: PostType;
  title?: string | null;
  excerpt?: string | null;
  tags?: string[];
  createdAt: string;

  author: {
    id: string;
    name: string;
  };

  stats?: {
    likeCount?: number;
    bookmarkCount?: number;
  };

  viewer?: {
    isLiked?: boolean;
    isBookmarked?: boolean;
  };

  imageUrl?: string | null;
  primaryImage?: string | null;
  images?: string[];
  hasMultiple?: boolean;
  renderImages?: PostRenderImages | null;
  layoutJson?: unknown;
};

export type CursorPage<T> = {
  items: T[];
  nextCursor: string | null;
  hasNext: boolean;
};
