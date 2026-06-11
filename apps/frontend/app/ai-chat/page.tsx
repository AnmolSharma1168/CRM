'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageSquareText, Send, Sparkles, Bot, User, Loader2, Plus, Filter, Megaphone } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/Toaster';
import { useRouter } from 'next/navigation';

type Message = {
  role: 'user' | 'model';
  content: string;
};

const STARTER_PROMPTS = [
  'Show me customers who haven\'t ordered in 60 days',
  'Which city has the highest average spend?',
  'Find high-value customers tagged as VIP',
  'How many customers spent over ₹10,000 total?',
  'Suggest a campaign for dormant customers',
  'Who are my most loyal customers?',
];

export default function AIChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      content: `👋 Hi! I'm **XenoAI**, your CRM intelligence assistant.\n\nI can help you:\n- 🔍 Explore your customer data\n- 🎯 Create smart segments\n- 📊 Analyze campaign performance\n- 💡 Suggest marketing strategies\n\nWhat would you like to know?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const content = text ?? input.trim();
    if (!content || loading) return;

    const userMsg: Message = { role: 'user', content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await api.ai.chat(
        newMessages.map((m) => ({ role: m.role, content: m.content }))
      );
      const aiMsg: Message = { role: 'model', content: res.data.response };
      setMessages([...newMessages, aiMsg]);
    } catch (err) {
      toast((err as Error).message, 'error');
      // Remove failed user message
      setMessages(messages);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSegment = () => {
    router.push('/segments');
    toast('Opening segment creator...', 'info');
  };

  const handleNewCampaign = () => {
    router.push('/campaigns/new');
    toast('Opening campaign wizard...', 'info');
  };

  const renderMessageContent = (content: string) => {
    // Simple markdown-like rendering
    const lines = content.split('\n');
    return lines.map((line, i) => {
      if (line.startsWith('- ') || line.startsWith('• ')) {
        return (
          <li key={i} className="ml-4 list-none flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
          </li>
        );
      }
      if (line === '') return <br key={i} />;
      return (
        <p key={i} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
      );
    });
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="px-8 py-5 border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <MessageSquareText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-base gradient-text">XenoAI Chat</h1>
              <p className="text-xs text-muted-foreground">Powered by Gemini 2.0 Flash</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" leftIcon={<Filter className="w-3.5 h-3.5" />} onClick={handleCreateSegment}>
              Create Segment
            </Button>
            <Button size="sm" leftIcon={<Megaphone className="w-3.5 h-3.5" />} onClick={handleNewCampaign}>
              New Campaign
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-6 px-4">
        <div className="max-w-3xl mx-auto space-y-5">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                'flex gap-3 animate-fade-in',
                msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              )}
            >
              {/* Avatar */}
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                msg.role === 'user'
                  ? 'bg-gradient-to-br from-cyan-500 to-blue-600'
                  : 'bg-gradient-to-br from-purple-500 to-violet-600 shadow-md shadow-purple-500/20'
              )}>
                {msg.role === 'user'
                  ? <User className="w-4 h-4 text-white" />
                  : <Sparkles className="w-4 h-4 text-white" />}
              </div>

              {/* Bubble */}
              <div className={cn(
                'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-tr-none'
                  : 'bg-card border border-border/50 text-foreground rounded-tl-none'
              )}>
                <div className="space-y-1">
                  {renderMessageContent(msg.content)}
                </div>
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="flex gap-3 animate-fade-in">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="bg-card border border-border/50 rounded-2xl rounded-tl-none px-4 py-3">
                <div className="flex gap-1.5 items-center">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full bg-primary animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Starter prompts (only on first load) */}
      {messages.length === 1 && (
        <div className="px-4 pb-4">
          <div className="max-w-3xl mx-auto">
            <p className="text-xs text-muted-foreground mb-2 font-medium">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {STARTER_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  className="text-xs px-3 py-1.5 rounded-full bg-secondary hover:bg-secondary/80 border border-border/50 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-6 border-t border-border/50 pt-4 bg-background/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ask anything about your customers, segments, or campaigns..."
            disabled={loading}
            className="flex-1 bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all disabled:opacity-50"
          />
          <Button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            loading={loading}
            className="rounded-xl px-4"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
