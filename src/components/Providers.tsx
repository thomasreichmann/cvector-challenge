"use client";

import { ConfigProvider } from "@arco-design/web-react";
import "@arco-design/web-react/es/_util/react-19-adapter";
import enUS from "@arco-design/web-react/es/locale/en-US";
import { type ReactNode } from "react";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return <ConfigProvider locale={enUS}>{children}</ConfigProvider>;
}
