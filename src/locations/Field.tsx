import { ChangeEvent, useState, useEffect, useMemo, useRef } from "react";
import {
  Switch,
  TextInput,
  Flex,
  IconButton,
} from "@contentful/f36-components";
import { PlusCircleIcon, PlusIcon, DeleteIcon } from "@contentful/f36-icons";
import { FieldAppSDK } from "@contentful/app-sdk";
import { useSDK } from "@contentful/react-apps-toolkit";
import { v4 as uuid } from "uuid";
import { createPortal } from "react-dom";
import {
  SortableTreeItem,
  sortableTreeKeyboardCoordinates,
} from "../components/TreeItem";

import { CSS } from "@dnd-kit/utilities";

import {
  buildTree,
  flattenTree,
  getProjection,
  getChildCount,
  removeItem,
  removeChildrenOf,
  setProperty,
} from "../utils";

import {
  Announcements,
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverlay,
  DragMoveEvent,
  DragEndEvent,
  DragOverEvent,
  MeasuringStrategy,
  DropAnimation,
  Modifier,
  defaultDropAnimation,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  TreeItems,
  TreeItem,
  FlattenedItem,
  SensorContext,
  UpdateType,
} from "../types";

const indentationWidth = 50;
const indicator = false;
const collapsible = false;
const removable = false;

const dropAnimationConfig: DropAnimation = {
  keyframes({ transform }) {
    return [
      { opacity: 1, transform: CSS.Transform.toString(transform.initial) },
      {
        opacity: 0,
        transform: CSS.Transform.toString({
          ...transform.final,
          x: transform.final.x + 5,
          y: transform.final.y + 5,
        }),
      },
    ];
  },
  easing: "ease-out",
  sideEffects({ active }) {
    active.node.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: defaultDropAnimation.duration,
      easing: defaultDropAnimation.easing,
    });
  },
};

const measuring = {
  droppable: {
    strategy: MeasuringStrategy.Always,
  },
};

const initialItems: TreeItems = [
  {
    id: "something",
    label: "link-1",
    url: "url-1",
    children: [
      {
        id: "child",
        label: "child-label",
        url: "child-url-1",
        children: [],
      },
    ],
  },
  {
    id: "somethingelse",
    label: "link-2",
    url: "url-2",
    children: [],
  },
];

const Field = () => {
  const sdk = useSDK<FieldAppSDK>();
  const [items, setItems] = useState(initialItems);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [offsetLeft, setOffsetLeft] = useState(0);
  const [currentPosition, setCurrentPosition] = useState<{
    parentId: string | null;
    overId: string;
  } | null>(null);

  useEffect(() => {
    sdk.window.startAutoResizer();
    setItems(sdk.field.getValue());
  }, []);

  useEffect(() => {
    console.log(items);
    sdk.field.setValue(items);
  }, [items]);

  function handleRemove(id: string) {
    setItems((items) => removeItem(items, id));
  }

  function handleCollapse(id: string) {
    setItems((items) =>
      setProperty(items, id, "collapsed", (value) => {
        return !value;
      })
    );
  }

  const flattenedItems = useMemo(() => {
    const flattenedTree = flattenTree(items);
    const collapsedItems = flattenedTree.reduce<string[]>(
      (acc, { children, collapsed, id }) =>
        collapsed && children.length ? [...acc, id] : acc,
      []
    );

    return removeChildrenOf(
      flattenedTree,
      activeId ? [activeId, ...collapsedItems] : collapsedItems
    );
  }, [activeId, items]);

  const sortedIds = useMemo(
    () => flattenedItems.map(({ id }) => id),
    [flattenedItems]
  );
  const activeItem = activeId
    ? flattenedItems.find(({ id }) => id === activeId)
    : null;

  const projected =
    activeId && overId
      ? getProjection(
          flattenedItems,
          activeId,
          overId,
          offsetLeft,
          indentationWidth
        )
      : null;

  const sensorContext: SensorContext = useRef({
    items: flattenedItems,
    offset: offsetLeft,
  });

  const [coordinateGetter] = useState(() =>
    sortableTreeKeyboardCoordinates(sensorContext, indicator, indentationWidth)
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter,
    })
  );

  const announcements: Announcements = {
    onDragStart({ active }) {
      return `Picked up ${active.id}.`;
    },
    onDragMove({ active, over }) {
      return getMovementAnnouncement(
        "onDragMove",
        active.id.toString(),
        over?.id.toString()
      );
    },
    onDragOver({ active, over }) {
      return getMovementAnnouncement(
        "onDragOver",
        active.id.toString(),
        over?.id.toString()
      );
    },
    onDragEnd({ active, over }) {
      return getMovementAnnouncement(
        "onDragEnd",
        active.id.toString(),
        over?.id.toString()
      );
    },
    onDragCancel({ active }) {
      return `Moving was cancelled. ${active.id} was dropped in its original position.`;
    },
  };

  /** A simple utility function to create a 'blank' item
   * @returns A blank `Item` with a uuid
   */
  function createItem(): TreeItem {
    return {
      id: uuid(),
      label: "Nav Item Label",
      url: "/placeholder-url",
      highlighted: "off",
      children: [],
    };
  }

  const addItem = (id?: string) => {
    const createdItem = createItem();
    setItems((prevState) => {
      const newState = [...prevState, createdItem];
      return newState;
    });
  };

  const handleValueChange = (
    e: ChangeEvent<HTMLInputElement>,
    type: UpdateType
  ) => {
    const { id, value } = e.target;

    console.log(type, id, value.toString());
    const newItems = updateItemById(type, id, value, items);
    setItems(newItems);
  };

  // Update function to change the label of the item
  const updateFn = (
    item: TreeItem,
    type: UpdateType,
    value: string
  ): TreeItem => {
    return { ...item, [type]: value };
  };

  /** Recursive function to update an item by ID in a tree structure */
  const updateItemById = (
    type: UpdateType,
    id: string,
    value: string,
    items: TreeItems
  ): TreeItems => {
    return items.map((item) => {
      if (item.id === id) {
        let newValue = value;
        // Apply the update function to create a new item with the updated values
        if (type === "highlighted") {
          newValue = item.highlighted === "on" ? "off" : "on";
        }
        return updateFn(item, type, newValue);
      }

      if (item.children && item.children.length > 0) {
        // Recursively update child nodes
        return {
          ...item,
          children: updateItemById(type, id, value, item.children),
        };
      }

      return item;
    });
  };

  return (
    <>
      <DndContext
        accessibility={{ announcements }}
        sensors={sensors}
        collisionDetection={closestCenter}
        measuring={measuring}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={sortedIds}>
          {flattenedItems.map(
            ({ id, children, label, highlighted, url, collapsed, depth }) => (
              <SortableTreeItem
                key={id}
                id={id}
                value={id}
                highlighted={highlighted}
                url={url}
                label={label}
                depth={id === activeId && projected ? projected.depth : depth}
                indentationWidth={indentationWidth}
                indicator={indicator}
                collapsed={Boolean(collapsed && children.length)}
                onValueChange={handleValueChange}
                onCollapse={
                  collapsible && children.length
                    ? () => handleCollapse(id)
                    : undefined
                }
                onRemove={() => handleRemove(id)}
              />
            )
          )}
        </SortableContext>
        {createPortal(
          <DragOverlay
            dropAnimation={dropAnimationConfig}
            modifiers={indicator ? [adjustTranslate] : undefined}
          >
            {activeId && activeItem ? (
              <SortableTreeItem
                id={activeId}
                depth={activeItem.depth}
                clone
                childCount={getChildCount(items, activeId) + 1}
                value={activeId.toString()}
                onValueChange={handleValueChange}
                indentationWidth={indentationWidth}
              />
            ) : null}
          </DragOverlay>,
          document.body
        )}
      </DndContext>
      <IconButton
        aria-label="add nav item"
        icon={<PlusCircleIcon />}
        onClick={() => addItem()}
      />
    </>
  );

  function handleDragStart({ active: { id: activeId } }: DragStartEvent) {
    setActiveId(activeId.toString());
    setOverId(activeId.toString());

    const activeItem = flattenedItems.find(({ id }) => id === activeId);

    if (activeItem) {
      setCurrentPosition({
        parentId: activeItem.parentId?.toString() || null,
        overId: activeId.toString(),
      });
    }

    document.body.style.setProperty("cursor", "grabbing");
  }

  function handleDragMove({ delta }: DragMoveEvent) {
    setOffsetLeft(delta.x);
  }

  function handleDragOver({ over }: DragOverEvent) {
    setOverId(over?.id.toString() ?? null);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    resetState();

    if (projected && over) {
      const { depth, parentId } = projected;
      const clonedItems: FlattenedItem[] = JSON.parse(
        JSON.stringify(flattenTree(items))
      );
      const overIndex = clonedItems.findIndex(({ id }) => id === over.id);
      const activeIndex = clonedItems.findIndex(({ id }) => id === active.id);
      const activeTreeItem = clonedItems[activeIndex];

      clonedItems[activeIndex] = { ...activeTreeItem, depth, parentId };

      const sortedItems = arrayMove(clonedItems, activeIndex, overIndex);
      const newItems = buildTree(sortedItems);

      setItems(newItems);
    }
  }

  function handleDragCancel() {
    resetState();
  }

  function resetState() {
    setOverId(null);
    setActiveId(null);
    setOffsetLeft(0);
    setCurrentPosition(null);

    document.body.style.setProperty("cursor", "");
  }

  function getMovementAnnouncement(
    eventName: string,
    activeId: string,
    overId?: string
  ) {
    if (overId && projected) {
      if (eventName !== "onDragEnd") {
        if (
          currentPosition &&
          projected.parentId === currentPosition.parentId &&
          overId === currentPosition.overId
        ) {
          return;
        } else {
          setCurrentPosition({
            parentId: projected.parentId?.toString() || null,
            overId,
          });
        }
      }

      const clonedItems: FlattenedItem[] = JSON.parse(
        JSON.stringify(flattenTree(items))
      );
      const overIndex = clonedItems.findIndex(({ id }) => id === overId);
      const activeIndex = clonedItems.findIndex(({ id }) => id === activeId);
      const sortedItems = arrayMove(clonedItems, activeIndex, overIndex);

      const previousItem = sortedItems[overIndex - 1];

      let announcement;
      const movedVerb = eventName === "onDragEnd" ? "dropped" : "moved";
      const nestedVerb = eventName === "onDragEnd" ? "dropped" : "nested";

      if (!previousItem) {
        const nextItem = sortedItems[overIndex + 1];
        announcement = `${activeId} was ${movedVerb} before ${nextItem.id}.`;
      } else {
        if (projected.depth > previousItem.depth) {
          announcement = `${activeId} was ${nestedVerb} under ${previousItem.id}.`;
        } else {
          let previousSibling: FlattenedItem | undefined = previousItem;
          while (previousSibling && projected.depth < previousSibling.depth) {
            const parentId: string | null = previousSibling?.parentId || null;
            previousSibling = sortedItems.find(({ id }) => id === parentId);
          }

          if (previousSibling) {
            announcement = `${activeId} was ${movedVerb} after ${previousSibling.id}.`;
          }
        }
      }

      return announcement;
    }

    return;
  }
};

// !END TEST SECTION DND

// useEffect(() => {
//   // This ensures our app has enough space to render
//   sdk.window.startAutoResizer();

//   // Every time we change the value on the field, we update internal state
//   sdk.field.onValueChanged((value: MainNavItem[]) => {
//     if (Array.isArray(value)) {
//       setItems(value);
//     }
//   });
// });

// const findItemIndex = (id?: string) => {
//   return items.findIndex((item, idx) => {
//     console.log(item.id, id, idx);
//     return item.id === id;
//   });
// };

// // ------------------------------------------------------------- Handle Adding additional Nav Items

// const addItem = (id?: string) => {
//   const foundIdx = findItemIndex(id);

//   const newItems = [
//     ...items.slice(0, foundIdx + 1),
//     createItem("main"),
//     ...items.slice(foundIdx + 1),
//   ];

//   sdk.field.setValue(newItems);
// };

// const addChildItem = (parentId: string, childId?: string) => {
//   const foundParentIdx = findItemIndex(parentId);
//   const parent = items[foundParentIdx];

//   const foundChildIdx = parent.childItems.findIndex(
//     (child) => child.id === childId
//   );

//   const updatedChildItems = [
//     ...parent.childItems.slice(0, foundChildIdx + 1),
//     createItem("child"),
//     ...parent.childItems.slice(foundChildIdx + 1),
//   ];

//   const newItems = [...items];
//   newItems[foundParentIdx] = { ...parent, childItems: updatedChildItems };

//   sdk.field.setValue(newItems);
// };

// // ------------------------------------------------------------- Handle Update Nav Item Values

// const updateItem = (
//   value: string,
//   id: string,
//   type: "label" | "url" | "highlighted",
//   parentId?: string
// ) => {
//   if (parentId) {
//     // handle child update
//     const foundParentIdx = findItemIndex(parentId);
//     const foundParent = items[foundParentIdx];
//     const foundChildIdx = foundParent.childItems.findIndex(
//       (child) => child.id === id
//     );
//     const newItems = [...items];
//     newItems[foundParentIdx].childItems[foundChildIdx][type] = value;
//     sdk.field.setValue(newItems);
//   } else {
//     // just handle field update
//     const foundIndex = findItemIndex(id);
//     const newItems = [...items];
//     newItems[foundIndex][type] = value;
//     sdk.field.setValue(newItems);
//   }
// };

// const removeItem = (id: string, parentId?: string) => {
//   if (parentId) {
//     // handle removal of a child nav element
//     const foundParentIdx = findItemIndex(parentId);
//     const foundParent = items[foundParentIdx];
//     const foundChildIdx = foundParent.childItems.findIndex(
//       (child) => child.id === id
//     );
//     const newItems = [...items];
//     newItems[foundParentIdx].childItems = [
//       ...foundParent.childItems.slice(0, foundChildIdx),
//       ...foundParent.childItems.slice(foundChildIdx + 1),
//     ];
//     sdk.field.setValue(newItems);
//   } else {
//     const foundIdx = findItemIndex(id);
//     sdk.field.setValue([
//       ...items.slice(0, foundIdx),
//       ...items.slice(foundIdx + 1),
//     ]);
//   }
// };

// /** A simple utility function to create a 'blank' item
//  * @returns A blank `Item` with a uuid
//  */
// function createItem(subType: "main" | "child"): NavItem {
//   return {
//     id: uuid(),
//     label: subType === "main" ? "Nav Item Label" : "Sub Item Label",
//     url: subType === "main" ? "/placeholder-url" : "/placeholder-child-url",
//     highlighted: "off",
//     ...(subType === "main" && { childItems: [] }),
//   };
// }

// return (
//   <>
//     {items.map((item) => {
//       return (
//         <div key={item.id}>
//           <Flex
//             gap="spacingS"
//             marginTop="spacingM"
//             marginBottom="spacingXs"
//             alignItems="center"
//           >
//             <TextInput
//               aria-label="label"
//               value={item.label}
//               onChange={(e) => updateItem(e.target.value, item.id, "label")}
//             ></TextInput>
//             <TextInput
//               aria-label="url"
//               value={item.url}
//               onChange={(e) => updateItem(e.target.value, item.id, "url")}
//             ></TextInput>
//             <Switch
//               isChecked={item.highlighted === "on"}
//               onChange={() =>
//                 updateItem(
//                   item.highlighted === "on" ? "off" : "on",
//                   item.id,
//                   "highlighted"
//                 )
//               }
//             >
//               Highlight
//             </Switch>
//             <IconButton
//               aria-label="add nav item"
//               icon={<PlusCircleIcon />}
//               onClick={() => addItem(item.id)}
//             />
//             <IconButton
//               aria-label="add child item"
//               icon={<PlusIcon />}
//               onClick={() => addChildItem(item.id)}
//             />
//             <IconButton
//               aria-label="delete item"
//               icon={<DeleteIcon />}
//               onClick={() => removeItem(item.id)}
//             />
//           </Flex>
//           {(item.childItems || []).map((subItem) => {
//             return (
//               <Flex
//                 key={subItem.id}
//                 marginLeft="spacingXl"
//                 gap="spacingS"
//                 alignItems="center"
//               >
//                 <TextInput
//                   aria-label="label"
//                   value={subItem.label}
//                   onChange={(e) =>
//                     updateItem(e.target.value, subItem.id, "label", item.id)
//                   }
//                 />
// <TextInput
//   value={subItem.url}
//   aria-label="url"
//   onChange={(e) =>
//     updateItem(e.target.value, subItem.id, "url", item.id)
//   }
// />
//                 <Switch
//                   isChecked={subItem.highlighted === "on"}
//                   onChange={(e) =>
//                     updateItem(
//                       subItem.highlighted === "on" ? "off" : "on",
//                       subItem.id,
//                       "highlighted",
//                       item.id
//                     )
//                   }
//                 >
//                   Highlight
//                 </Switch>
//                 <IconButton
//                   aria-label="add child item"
//                   icon={<PlusIcon />}
//                   onClick={() => addChildItem(item.id, subItem.id)}
//                 />
//                 <IconButton
//                   aria-label="delete item"
//                   icon={<DeleteIcon />}
//                   onClick={() => removeItem(subItem.id, item.id)}
//                 />
//               </Flex>
//             );
//           })}
//         </div>
//       );
//     })}
//   </>
// );
// };

const adjustTranslate: Modifier = ({ transform }) => {
  return {
    ...transform,
    y: transform.y - 25,
  };
};

export default Field;
