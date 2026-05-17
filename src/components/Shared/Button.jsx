import React from "react";

const Button = ({
  children,
  onClick,
  variant = "primary",
  className = "",
  disabled = false,
  type = "button",
  style = {},
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={`btn btn-${variant} ${className}`}
    style={style}
  >
    {children}
  </button>
);

export default Button;
