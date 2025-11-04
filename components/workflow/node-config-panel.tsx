'use client';

import { useAtom, useSetAtom } from 'jotai';
import { useState, useEffect, useRef } from 'react';
import {
  selectedNodeAtom,
  nodesAtom,
  updateNodeDataAtom,
  deleteNodeAtom,
  isGeneratingAtom,
} from '@/lib/workflow-store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TriggerConfig } from './config/trigger-config';
import { ActionConfig } from './config/action-config';
import { AvailableOutputs } from './available-outputs';

const MIN_WIDTH = 280;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 320;

export function NodeConfigPanel() {
  const [selectedNodeId, setSelectedNodeId] = useAtom(selectedNodeAtom);
  const [nodes] = useAtom(nodesAtom);
  const [isGenerating] = useAtom(isGeneratingAtom);
  const updateNodeData = useSetAtom(updateNodeDataAtom);
  const deleteNode = useSetAtom(deleteNodeAtom);
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId);

  // Load saved width from localStorage after mount to avoid hydration mismatch
  useEffect(() => {
    const saved = localStorage.getItem('nodeConfigPanelWidth');
    if (saved) {
      const width = parseInt(saved, 10);
      if (width >= MIN_WIDTH && width <= MAX_WIDTH) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPanelWidth(width);
      }
    }
  }, []);

  // Handle resize
  useEffect(() => {
    if (!isResizing) return;

    // Prevent text selection while resizing
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    const handleMouseMove = (e: MouseEvent) => {
      if (!panelRef.current) return;
      const panelRect = panelRef.current.getBoundingClientRect();
      const newWidth = panelRect.right - e.clientX;
      const clampedWidth = Math.min(Math.max(newWidth, MIN_WIDTH), MAX_WIDTH);
      setPanelWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      localStorage.setItem('nodeConfigPanelWidth', panelWidth.toString());
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing, panelWidth]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  if (!selectedNode) {
    return (
      <Card
        ref={panelRef}
        className="relative hidden h-full flex-col rounded-none border-t-0 border-r-0 border-b-0 border-l md:flex"
        style={{ width: `${panelWidth}px` }}
      >
        {/* Resize handle */}
        <div
          className="absolute top-0 bottom-0 left-0 z-10 w-1 cursor-col-resize hover:bg-blue-500 active:bg-blue-600"
          onMouseDown={handleResizeStart}
          style={{ cursor: isResizing ? 'col-resize' : undefined }}
        />
        <CardHeader>
          <CardTitle className="text-lg">Properties</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground text-sm">Select a node to configure</div>
        </CardContent>
      </Card>
    );
  }

  const handleUpdateLabel = (label: string) => {
    updateNodeData({ id: selectedNode.id, data: { label } });
  };

  const handleUpdateDescription = (description: string) => {
    updateNodeData({ id: selectedNode.id, data: { description } });
  };

  const handleUpdateConfig = (key: string, value: string) => {
    const newConfig = { ...selectedNode.data.config, [key]: value };
    updateNodeData({ id: selectedNode.id, data: { config: newConfig } });
  };

  const handleDelete = () => {
    if (selectedNodeId) {
      deleteNode(selectedNodeId);
    }
  };

  const handleClose = () => {
    setSelectedNodeId(null);
  };

  return (
    <>
      {/* Mobile overlay backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 md:hidden"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Properties panel - Mobile: Fixed sidebar, Desktop: Resizable sidebar */}
      <Card
        ref={panelRef}
        className="fixed top-0 right-0 bottom-0 z-50 flex h-full w-80 flex-col rounded-none border-t-0 border-r-0 border-b-0 border-l md:relative md:z-0"
        style={{ width: `${panelWidth}px` }}
      >
        {/* Resize handle - only visible on desktop */}
        <div
          className="absolute top-0 bottom-0 left-0 z-10 hidden w-1 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 md:block"
          onMouseDown={handleResizeStart}
          style={{ cursor: isResizing ? 'col-resize' : undefined }}
        />
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Properties</CardTitle>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="flex-1 space-y-4 overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor="label">Label</Label>
            <Input
              id="label"
              value={selectedNode.data.label}
              onChange={(e) => handleUpdateLabel(e.target.value)}
              disabled={isGenerating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={selectedNode.data.description || ''}
              onChange={(e) => handleUpdateDescription(e.target.value)}
              placeholder="Optional description"
              disabled={isGenerating}
            />
          </div>

          {/* Show available outputs from previous nodes */}
          {(selectedNode.data.type === 'action' ||
            selectedNode.data.type === 'condition' ||
            selectedNode.data.type === 'transform') && <AvailableOutputs />}

          <div className="space-y-2">
            <Label className="text-sm font-medium">Configuration</Label>
            <div className="space-y-2">
              {selectedNode.data.type === 'trigger' && (
                <TriggerConfig
                  config={selectedNode.data.config || {}}
                  onUpdateConfig={handleUpdateConfig}
                  disabled={isGenerating}
                />
              )}

              {selectedNode.data.type === 'action' && (
                <ActionConfig
                  config={selectedNode.data.config || {}}
                  onUpdateConfig={handleUpdateConfig}
                  disabled={isGenerating}
                />
              )}

              {selectedNode.data.type === 'condition' && (
                <div className="space-y-2">
                  <Label htmlFor="condition" className="text-xs">
                    Condition
                  </Label>
                  <Input
                    id="condition"
                    value={(selectedNode.data.config?.condition as string) || ''}
                    onChange={(e) => handleUpdateConfig('condition', e.target.value)}
                    placeholder="e.g., value > 100"
                    disabled={isGenerating}
                  />
                </div>
              )}

              {selectedNode.data.type === 'transform' && (
                <div className="space-y-2">
                  <Label htmlFor="transformType" className="text-xs">
                    Transform Type
                  </Label>
                  <Input
                    id="transformType"
                    value={(selectedNode.data.config?.transformType as string) || ''}
                    onChange={(e) => handleUpdateConfig('transformType', e.target.value)}
                    placeholder="e.g., Map Data, Filter, Aggregate"
                    disabled={isGenerating}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="border-t pt-4">
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleDelete}
              disabled={isGenerating}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Node
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
