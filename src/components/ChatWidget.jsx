import { useState, useEffect } from "react";
import {
  ExpandableChat,
  ExpandableChatHeader,
  ExpandableChatBody,
} from "@/components/ui/expandable-chat";
import { Chat } from "@/components/ui/chat";
import { MessageCircle } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';

export function ChatWidget() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      content: "Hello! How can I help you today?",
      role: "assistant",
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionUuid, setSessionUuid] = useState("");
  
  // Generate UUID once when component mounts
  useEffect(() => {
    const uuid = uuidv4();
    setSessionUuid(uuid);
    console.log("Generated UUID:", uuid);
    
    // Static response - simulate bot introduction
    setTimeout(() => {
      const botResponse = {
        id: Date.now(),
        content: "I am the Garage Manager Bot. How can I help you with inventory management today?",
        role: "assistant",
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, botResponse]);
    }, 500);
  }, []);

  const handleSendMessage = (content) => {
    if (!content.trim()) return;
    
    // Add user message
    const userMessage = {
      id: Date.now(),
      content,
      role: "user",
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    
    // Static response - simulate bot response
    setTimeout(() => {
      const lowerContent = content.toLowerCase();
      let botResponseText = "Thank you for your message. I'm a static demo bot. ";
      
      // Simple keyword-based responses
      if (lowerContent.includes('inventory') || lowerContent.includes('stock')) {
        botResponseText = "I can help you with inventory management. You can view items, check stock levels, and manage inventory through the dashboard.";
      } else if (lowerContent.includes('supplier') || lowerContent.includes('vendor')) {
        botResponseText = "Supplier management is available in the Supplier Management module. You can add, edit, and view supplier information there.";
      } else if (lowerContent.includes('user') || lowerContent.includes('account')) {
        botResponseText = "User management features are available in the Users module. You can manage user accounts and permissions there.";
      } else if (lowerContent.includes('invoice') || lowerContent.includes('sales')) {
        botResponseText = "Sales invoices can be managed in the Sales Invoice module. You can create, view, and edit invoices there.";
      } else if (lowerContent.includes('report')) {
        botResponseText = "Reports are available in the Reports module. You can generate various reports based on your data.";
      } else {
        botResponseText = "I'm here to help with inventory management. You can ask about items, suppliers, users, invoices, or reports.";
      }
      
      const botResponse = {
        id: Date.now() + 1,
        content: botResponseText,
        role: "assistant",
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, botResponse]);
      setIsLoading(false);
    }, 800); // Simulate network delay
  };

  return (
    <ExpandableChat position="bottom-right" size="md" icon={<MessageCircle className="h-6 w-6" />}>
      <ExpandableChatHeader>
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          <h3 className="font-medium">Garage Manager</h3>
        </div>
        <div className="text-xs text-muted-foreground">
          Ask about vehicles, services, or parts
        </div>
      </ExpandableChatHeader>
      <ExpandableChatBody>
        <Chat
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          className="h-full"
        />
      </ExpandableChatBody>
    </ExpandableChat>
  );
}

