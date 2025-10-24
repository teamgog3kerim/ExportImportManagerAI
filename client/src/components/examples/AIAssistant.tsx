import { useState } from "react";
import { AIAssistant } from "../AIAssistant";
import { Button } from "@/components/ui/button";

export default function AIAssistantExample() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-4">
      <Button onClick={() => setIsOpen(true)}>Open AI Assistant</Button>
      <AIAssistant isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
}
