import { ChangeEvent, forwardRef, HTMLAttributes } from "react";
import classNames from "classnames";
import { Handle, Remove } from "../Item";

import { Switch, TextInput, Flex } from "@contentful/f36-components";

import styles from "./TreeItem.module.css";
import { UpdateType } from "../../types";

export interface Props extends Omit<HTMLAttributes<HTMLLIElement>, "id"> {
  childCount?: number;
  clone?: boolean;
  id: string;
  url?: string;
  label?: string;
  collapsed?: boolean;
  depth: number;
  disableInteraction?: boolean;
  disableSelection?: boolean;
  ghost?: boolean;
  handleProps?: any;
  highlighted?: string;
  indicator?: boolean;
  indentationWidth: number;
  value: string;
  onCollapse?(): void;
  onRemove?(): void;
  onValueChange(e: ChangeEvent<HTMLInputElement>, type: UpdateType): void;
  wrapperRef?(node: HTMLLIElement): void;
}

export const TreeItem = forwardRef<HTMLDivElement, Props>(
  (
    {
      childCount,
      clone,
      depth,
      disableSelection,
      disableInteraction,
      ghost,
      handleProps,
      highlighted,
      indentationWidth,
      indicator,
      collapsed,
      label,
      onCollapse,
      onRemove,
      style,
      url,
      value,
      wrapperRef,
      onValueChange,
      ...props
    },
    ref
  ) => {
    return (
      <Flex gap="spacingS" marginBottom="spacingXs" alignItems="center">
        <li
          className={classNames(
            styles.Wrapper,
            clone && styles.clone,
            ghost && styles.ghost,
            indicator && styles.indicator,
            disableSelection && styles.disableSelection,
            disableInteraction && styles.disableInteraction
          )}
          ref={wrapperRef}
          style={
            {
              "--spacing": `${indentationWidth * depth}px`,
            } as React.CSSProperties
          }
          {...props}
        >
          <div className={styles.row} ref={ref}>
            <div>
              <Handle {...handleProps} />
              <TextInput
                aria-label="label"
                value={label}
                id={props.id}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  onValueChange(e, "label")
                }
              />
              <TextInput
                value={url}
                aria-label="url"
                id={props.id}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  onValueChange(e, "url")
                }
              />
            </div>
            <div className={styles.right}>
              <Switch
                isChecked={highlighted === "on"}
                value={highlighted}
                id={props.id}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  onValueChange(e, "highlighted")
                }
              />
              <span className={styles.Actions}>
                {onRemove ? (
                  <Remove className={styles.Remove} onClick={onRemove} />
                ) : null}
              </span>
            </div>
          </div>
        </li>
      </Flex>
    );
  }
);
