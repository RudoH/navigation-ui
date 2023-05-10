import React, { useState, useEffect } from "react";
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

interface NavItem {
  id: string;
  label: string;
  url: string;
  highlighted: string;
}

interface MainNavItem extends NavItem {
  childItems: NavItem[];
}

const initial: MainNavItem[] = [
  {
    id: "1",
    label: "Placeholder Label",
    url: "/placeholder-url",
    highlighted: "off",
    childItems: [
      {
        id: "4",
        label: "Placeholder Child",
        url: "/placeholder-child-url",
        highlighted: "off",
      },
    ],
  },
];

const Field = () => {
  const sdk = useSDK<FieldAppSDK>();
  const [items, setItems] = useState(initial);

  useEffect(() => {
    // This ensures our app has enough space to render
    sdk.window.startAutoResizer();

    // Every time we change the value on the field, we update internal state
    sdk.field.onValueChanged((value: MainNavItem[]) => {
      if (Array.isArray(value)) {
        setItems(value);
      }
    });
  });

  const findItemIndex = (id?: string) => {
    return items.findIndex((item, idx) => {
      console.log(item.id, id, idx);
      return item.id === id;
    });
  };

  // ------------------------------------------------------------- Handle Adding additional Nav Items

  const addItem = (id?: string) => {
    const foundIdx = findItemIndex(id);

    const newItems = [
      ...items.slice(0, foundIdx + 1),
      createItem("main"),
      ...items.slice(foundIdx + 1),
    ];

    sdk.field.setValue(newItems);
  };

  const addChildItem = (parentId: string, childId?: string) => {
    console.log("parentId:", parentId);
    const foundParentIdx = findItemIndex(parentId);
    console.log("found parent idx:", foundParentIdx);
    const parent = items[foundParentIdx];
    console.log("parent:", parent);

    const foundChildIdx = parent.childItems.findIndex(
      (child) => child.id === childId
    );

    const updatedChildItems = [
      ...parent.childItems.slice(0, foundChildIdx + 1),
      createItem("child"),
      ...parent.childItems.slice(foundChildIdx + 1),
    ];

    const newItems = [...items];
    newItems[foundParentIdx] = { ...parent, childItems: updatedChildItems };

    sdk.field.setValue(newItems);
  };

  // ------------------------------------------------------------- Handle Update Nav Item Values

  const updateItem = (
    value: string,
    id: string,
    type: "label" | "url" | "highlighted",
    parentId?: string
  ) => {
    if (parentId) {
      // handle child update
      const foundParentIdx = findItemIndex(parentId);
      const foundParent = items[foundParentIdx];
      const foundChildIdx = foundParent.childItems.findIndex(
        (child) => child.id === id
      );
      const newItems = [...items];
      console.log("CHILD:", newItems[foundParentIdx].childItems[foundChildIdx]);
      newItems[foundParentIdx].childItems[foundChildIdx][type] = value;
      sdk.field.setValue(newItems);
    } else {
      // just handle field update
      console.log("id:", id);
      const foundIndex = findItemIndex(id);
      console.log("items:", items, foundIndex);
      const newItems = [...items];
      newItems[foundIndex][type] = value;
      sdk.field.setValue(newItems);
    }
  };

  const removeItem = (id: string, parentId?: string) => {
    if (parentId) {
      // handle removal of a child nav element
      const foundParentIdx = findItemIndex(parentId);
      const foundParent = items[foundParentIdx];
      const foundChildIdx = foundParent.childItems.findIndex(
        (child) => child.id === id
      );
      const newItems = [...items];
      newItems[foundParentIdx].childItems = [
        ...foundParent.childItems.slice(0, foundChildIdx),
        ...foundParent.childItems.slice(foundChildIdx + 1),
      ];
      sdk.field.setValue(newItems);
    } else {
      const foundIdx = findItemIndex(id);
      sdk.field.setValue([
        ...items.slice(0, foundIdx),
        ...items.slice(foundIdx + 1),
      ]);
    }
  };

  /** A simple utility function to create a 'blank' item
   * @returns A blank `Item` with a uuid
   */
  function createItem(subType: "main" | "child"): NavItem {
    return {
      id: uuid(),
      label: subType === "main" ? "Nav Item Label" : "Sub Item Label",
      url: subType === "main" ? "/placeholder-url" : "/placeholder-child-url",
      highlighted: "off",
      ...(subType === "main" && { childItems: [] }),
    };
  }

  if (!items?.length) {
    return (
      <IconButton
        aria-label="add nav item"
        icon={<PlusCircleIcon />}
        onClick={() => addItem()}
      />
    );
  }

  return (
    <>
      {items.map((item) => {
        return (
          <div key={item.id}>
            <Flex
              gap="spacingS"
              marginTop="spacingM"
              marginBottom="spacingXs"
              alignItems="center"
            >
              <TextInput
                aria-label="label"
                value={item.label}
                onChange={(e) => updateItem(e.target.value, item.id, "label")}
              ></TextInput>
              <TextInput
                aria-label="url"
                value={item.url}
                onChange={(e) => updateItem(e.target.value, item.id, "url")}
              ></TextInput>
              <Switch
                isChecked={item.highlighted === "on"}
                onChange={() =>
                  updateItem(
                    item.highlighted === "on" ? "off" : "on",
                    item.id,
                    "highlighted"
                  )
                }
              >
                Highlight
              </Switch>
              <IconButton
                aria-label="add nav item"
                icon={<PlusCircleIcon />}
                onClick={() => addItem(item.id)}
              />
              <IconButton
                aria-label="add child item"
                icon={<PlusIcon />}
                onClick={() => addChildItem(item.id)}
              />
              <IconButton
                aria-label="delete item"
                icon={<DeleteIcon />}
                onClick={() => removeItem(item.id)}
              />
            </Flex>
            {(item.childItems || []).map((subItem) => {
              return (
                <Flex
                  key={subItem.id}
                  marginLeft="spacingXl"
                  gap="spacingS"
                  alignItems="center"
                >
                  <TextInput
                    aria-label="label"
                    value={subItem.label}
                    onChange={(e) =>
                      updateItem(e.target.value, subItem.id, "label", item.id)
                    }
                  />
                  <TextInput
                    value={subItem.url}
                    aria-label="url"
                    onChange={(e) =>
                      updateItem(e.target.value, subItem.id, "url", item.id)
                    }
                  />
                  <Switch
                    isChecked={subItem.highlighted === "on"}
                    onChange={(e) =>
                      updateItem(
                        subItem.highlighted === "on" ? "off" : "on",
                        subItem.id,
                        "highlighted",
                        item.id
                      )
                    }
                  >
                    Highlight
                  </Switch>
                  <IconButton
                    aria-label="add child item"
                    icon={<PlusIcon />}
                    onClick={() => addChildItem(item.id, subItem.id)}
                  />
                  <IconButton
                    aria-label="delete item"
                    icon={<DeleteIcon />}
                    onClick={() => removeItem(subItem.id, item.id)}
                  />
                </Flex>
              );
            })}
          </div>
        );
      })}
    </>
  );
};

export default Field;
