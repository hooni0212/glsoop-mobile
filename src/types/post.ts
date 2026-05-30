import type { NormalizedProfileCosmeticsExpanded } from "@/types/cosmetics";

export type PostType = 'poem' | 'essay' | 'short';
export type PostVisibility = 'public' | 'followers' | 'unlisted' | 'private';
export type PostCommentPolicy = 'everyone' | 'logged_in' | 'followers' | 'author_only' | 'closed';

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
  visibility?: PostVisibility;
  commentPolicy?: PostCommentPolicy;
  createdAt: string;

  author: {
    id: string;
    name: string;
    profilePhotoUrl?: string | null;
    profilePhotoThumbnailUrl?: string | null;
    profileCosmetics?: NormalizedProfileCosmeticsExpanded;
  };

  stats?: {
    likeCount?: number;
    bookmarkCount?: number;
  };

  viewer?: {
    isLiked?: boolean;
    isBookmarked?: boolean;
    canRead?: boolean;
    canComment?: boolean;
    isAuthor?: boolean;
    visibilityReason?: string | null;
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
