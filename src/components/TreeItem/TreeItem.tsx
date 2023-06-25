import { ChangeEvent, forwardRef, HTMLAttributes } from "react";
import classNames from "classnames";
import { Handle, Remove } from "../Item";

import {
  Switch,
  TextInput,
  Flex,
  IconButton,
} from "@contentful/f36-components";

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

const collapseIcon = (
  <svg width="10" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 41">
    <path d="M30.76 39.2402C31.885 40.3638 33.41 40.995 35 40.995C36.59 40.995 38.115 40.3638 39.24 39.2402L68.24 10.2402C69.2998 9.10284 69.8768 7.59846 69.8494 6.04406C69.822 4.48965 69.1923 3.00657 68.093 1.90726C66.9937 0.807959 65.5106 0.178263 63.9562 0.150837C62.4018 0.123411 60.8974 0.700397 59.76 1.76024L35 26.5102L10.24 1.76024C9.10259 0.700397 7.59822 0.123411 6.04381 0.150837C4.4894 0.178263 3.00632 0.807959 1.90702 1.90726C0.807714 3.00657 0.178019 4.48965 0.150593 6.04406C0.123167 7.59846 0.700153 9.10284 1.75999 10.2402L30.76 39.2402Z" />
  </svg>
);
