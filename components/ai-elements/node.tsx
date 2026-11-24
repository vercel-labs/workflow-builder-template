import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Handle, Position } from "@xyflow/react";
import type { ComponentProps } from "react";
import { AnimatedBorder } from "@/components/ui/animated-border";

export type NodeProps = ComponentProps<typeof Card> & {
  handles: {
    target: boolean;
    source: boolean;
  };
  status?: "idle" | "running" | "success" | "error";
};

export const Node = ({ handles, className, status, ...props }: NodeProps) => (
  <Card
    className={cn(
      "node-container relative size-full h-auto w-sm gap-0 rounded-xl border p-0 transition-all duration-200",
      "border-white/40 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-white/5",
      "shadow-[0_10px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.35)]",
      status === "success" && "border-green-500/50",
      status === "error" && "border-red-500/50",
      className
    )}
    {...props}
  >
    {status === "running" && <AnimatedBorder />}
    {handles.target && <Handle position={Position.Left} type="target" />}
    {handles.source && <Handle position={Position.Right} type="source" />}
    {props.children}
  </Card>
);

export type NodeHeaderProps = ComponentProps<typeof CardHeader>;

export const NodeHeader = ({ className, ...props }: NodeHeaderProps) => (
  <CardHeader
    className={cn("gap-0.5 rounded-t-md border-b bg-secondary p-3!", className)}
    {...props}
  />
);

export type NodeTitleProps = ComponentProps<typeof CardTitle>;

export const NodeTitle = (props: NodeTitleProps) => <CardTitle {...props} />;

export type NodeDescriptionProps = ComponentProps<typeof CardDescription>;

export const NodeDescription = (props: NodeDescriptionProps) => (
  <CardDescription {...props} />
);

export type NodeActionProps = ComponentProps<typeof CardAction>;

export const NodeAction = (props: NodeActionProps) => <CardAction {...props} />;

export type NodeContentProps = ComponentProps<typeof CardContent>;

export const NodeContent = ({ className, ...props }: NodeContentProps) => (
  <CardContent className={cn("rounded-b-md bg-card p-3", className)} {...props} />
);

export type NodeFooterProps = ComponentProps<typeof CardFooter>;

export const NodeFooter = ({ className, ...props }: NodeFooterProps) => (
  <CardFooter
    className={cn("rounded-b-md border-t bg-secondary p-3!", className)}
    {...props}
  />
);
