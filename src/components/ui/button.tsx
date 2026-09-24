import type { ButtonHTMLAttributes } from "react";
export function Button({
  variant = "default",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "primary" | "quiet" }) {
  const variants = { default: "", primary: "button-primary", quiet: "button-quiet" };
  return <button type="button" className={`button ${variants[variant]} ${className}`} {...props} />;
}
