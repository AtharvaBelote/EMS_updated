"use client";

import React from "react";
import Button, { ButtonProps } from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";

export interface LoadingButtonProps extends ButtonProps {
  isLoading: boolean;
  loadingText?: string;
}

/**
 * Reusable button that shows a CircularProgress spinner when isLoading is true.
 * Sets disabled={true} while loading to prevent duplicate submissions.
 */
export function LoadingButton({
  isLoading,
  loadingText,
  children,
  startIcon,
  ...props
}: LoadingButtonProps) {
  return (
    <Button
      {...props}
      disabled={isLoading || props.disabled}
      startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : startIcon}
    >
      {isLoading && loadingText ? loadingText : children}
    </Button>
  );
}

export default LoadingButton;
