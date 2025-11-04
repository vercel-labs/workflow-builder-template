'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowUp } from 'lucide-react';
import { workflowApi } from '@/lib/workflow-api';
import { useSession } from '@/lib/auth-client';
import { toast } from 'sonner';

export function WorkflowPrompt() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { data: session } = useSession();

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    // Check if user is logged in
    if (!session) {
      // Redirect to login page
      router.push('/login');
      return;
    }

    setIsGenerating(true);
    try {
      // Create empty workflow first
      const newWorkflow = await workflowApi.create({
        name: 'AI Generated Workflow',
        description: `Generated from: ${prompt}`,
        nodes: [],
        edges: [],
      });

      // Store the prompt in sessionStorage for the workflow page to use
      sessionStorage.setItem('ai-prompt', prompt);
      sessionStorage.setItem('generating-workflow-id', newWorkflow.id);

      // Navigate to the new workflow immediately
      router.push(`/workflows/${newWorkflow.id}?generating=true`);
    } catch (error) {
      console.error('Failed to create workflow:', error);
      toast.error('Failed to create workflow. Please try again.');
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isGenerating) {
      e.preventDefault();
      if (prompt.trim()) {
        const form = e.currentTarget.closest('form');
        if (form) {
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }
      }
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <form onSubmit={handleGenerate}>
        <div className="bg-muted/30 relative cursor-text overflow-hidden rounded-2xl border shadow-sm">
          <div className="relative bg-transparent">
            <Textarea
              ref={textareaRef}
              placeholder="Describe your workflow..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isGenerating}
              required
              rows={3}
              autoFocus
              className="w-full resize-none border-0 !bg-transparent p-4 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>

          <div className="flex items-center justify-end gap-2 p-4 pt-0">
            <Button
              type="submit"
              disabled={isGenerating || !prompt.trim()}
              size="sm"
              className="h-8 w-8 rounded-full p-0"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
