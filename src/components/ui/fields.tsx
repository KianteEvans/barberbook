import type { ReactNode } from "react";

/** Labeled form controls with consistent styling, server-renderable. */

const controlStyle = {
  background: "var(--panel-2)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  padding: "9px 12px",
  fontSize: 14,
  color: "var(--text)",
  width: "100%",
  boxSizing: "border-box" as const,
};

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}): ReactNode {
  return (
    <label
      style={{
        display: "grid",
        gap: 6,
        fontSize: 12,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        color: "var(--muted)",
      }}
    >
      {label}
      {children}
    </label>
  );
}

export function TextInput(props: {
  name: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  min?: number | string;
  max?: number | string;
  step?: number | string;
}): ReactNode {
  return <input {...props} className="control" style={controlStyle} />;
}

export function Select({
  name,
  defaultValue,
  required,
  children,
}: {
  name: string;
  defaultValue?: string;
  required?: boolean;
  children: ReactNode;
}): ReactNode {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      required={required}
      className="control"
      style={controlStyle}
    >
      {children}
    </select>
  );
}

export function TextArea(props: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  rows?: number;
}): ReactNode {
  return (
    <textarea
      {...props}
      className="control"
      style={{ ...controlStyle, resize: "vertical" }}
    />
  );
}
