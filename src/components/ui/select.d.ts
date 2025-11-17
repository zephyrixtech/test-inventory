import * as React from "react";

interface SelectProps {
  children: React.ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}

interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "default" | "sm";
}

interface SelectContentProps extends React.HTMLAttributes<HTMLDivElement> {
  position?: "popper" | "item-aligned";
}

interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {}

interface SelectValueProps {
  placeholder?: string;
  children?: React.ReactNode;
}

declare const Select: React.FC<SelectProps>;
declare const SelectTrigger: React.ForwardRefExoticComponent<SelectTriggerProps & React.RefAttributes<HTMLButtonElement>>;
declare const SelectContent: React.ForwardRefExoticComponent<SelectContentProps & React.RefAttributes<HTMLDivElement>>;
declare const SelectItem: React.ForwardRefExoticComponent<SelectItemProps & React.RefAttributes<HTMLDivElement>>;
declare const SelectValue: React.FC<SelectValueProps>;

export {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
};