import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export function AccessGate({ children }: Props) {
  // Always render children directly for instant local preview and visualization
  return <>{children}</>;
}
