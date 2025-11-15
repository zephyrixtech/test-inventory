declare module "@/components/ui/button" {
  import * as React from "react";
  
  interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    size?: "default" | "sm" | "lg" | "icon";
    asChild?: boolean;
  }
  
  const Button: React.ForwardRefExoticComponent<ButtonProps & React.RefAttributes<HTMLButtonElement>>;
  
  export { Button };
  export type { ButtonProps };
}

declare module "@/components/ui/input" {
  import * as React from "react";
  
  interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}
  
  const Input: React.ForwardRefExoticComponent<InputProps & React.RefAttributes<HTMLInputElement>>;
  
  export { Input };
  export type { InputProps };
}

declare module "@/components/ui/label" {
  import * as React from "react";
  
  interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}
  
  const Label: React.ForwardRefExoticComponent<LabelProps & React.RefAttributes<HTMLLabelElement>>;
  
  export { Label };
  export type { LabelProps };
}

declare module "@/components/ui/select" {
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
  
  interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
    value: string;
  }
  
  interface SelectValueProps {
    placeholder?: string;
  }
  
  const Select: React.FC<SelectProps>;
  const SelectTrigger: React.ForwardRefExoticComponent<SelectTriggerProps & React.RefAttributes<HTMLButtonElement>>;
  const SelectContent: React.ForwardRefExoticComponent<SelectContentProps & React.RefAttributes<HTMLDivElement>>;
  const SelectItem: React.ForwardRefExoticComponent<SelectItemProps & React.RefAttributes<HTMLDivElement>>;
  const SelectValue: React.FC<SelectValueProps>;
  
  export {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue,
  };
}