import type { MutableRefObject } from "react";

export type UpdateType = "label" | "highlighted" | "url";

export interface TreeItem {
  id: string;
  children: TreeItem[];
  label?: string;
  url?: string;
  highlighted?: string;
  collapsed?: boolean;
}

export type TreeItems = TreeItem[];

export interface FlattenedItem extends TreeItem {
  parentId?: string | null;
  depth: number;
  index: number;
}

export type SensorContext = MutableRefObject<{
  items: FlattenedItem[];
  offset: number;
}>;
