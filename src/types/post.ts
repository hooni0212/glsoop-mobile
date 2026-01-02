export type PostType = 'poem' | 'essay' | 'short';

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
};

export type CursorPage<T> = {
  items: T[];
  nextCursor: string | null;
  hasNext: boolean;
};
