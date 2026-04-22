import { useState, useRef, useEffect } from "react";
import { X, Send, Sparkles, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

const suggestedPrompts = [
  "Show me delayed shipments",
  "Which LCs are expiring soon?",
  "Which budgets are over limit?",
  "Summarize today's operations",
];

export function AIAssistant({ isOpen, onClose }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hello! I'm your AI assistant for import operations. I can help you track shipments, analyze budgets, and answer questions about your LCs. How can I assist you today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (message?: string) => {
    const text = message || input;
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/ai/chat", { message: text });
      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      toast({ title: "Failed to get AI response", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-end" onClick={onClose}>
      <div
        className="bg-background border-l h-full w-full sm:w-[400px] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
        data-testid="ai-assistant-panel"
      >
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">AI Assistant</h2>
              <p className="text-xs text-muted-foreground">Powered by GPT-4o-mini</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-assistant">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-hidden" ref={scrollRef}>
          <ScrollArea className="h-full p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  data-testid={`message-${message.role}`}
                >
                  {message.role === "assistant" && (
                    <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center shrink-0 mt-1">
                      <Bot className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs opacity-60 mt-1.5">
                      {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <Bot className="h-3 w-3 text-primary-foreground" />
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {messages.length === 1 && (
          <div className="px-4 pb-3 shrink-0">
            <p className="text-xs text-muted-foreground mb-2">Suggested questions</p>
            <div className="flex flex-wrap gap-2">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSend(prompt)}
                  className="text-xs px-3 py-1.5 rounded-md border hover-elevate active-elevate-2 text-muted-foreground"
                  data-testid={`prompt-${prompt.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="p-4 border-t shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your imports..."
              disabled={isLoading}
              data-testid="input-ai-message"
            />
            <Button type="submit" size="icon" disabled={isLoading || !input.trim()} data-testid="button-send-message">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
