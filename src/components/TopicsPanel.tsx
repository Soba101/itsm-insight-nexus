import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { InfoIcon } from "lucide-react";
import { NLPTopic } from "@/lib/types";

interface TopicsPanelProps {
  topics?: NLPTopic[];
}

export function TopicsPanel({ topics }: TopicsPanelProps) {
  if (!topics || topics.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Topics (NLP Analysis)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No topics found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Top Topics (NLP Analysis)</CardTitle>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="inline-flex items-center">
                  <InfoIcon className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm" side="top">
                <p className="font-semibold mb-1">AI-Powered Topic Analysis</p>
                <p className="text-xs">
                  • Automatically analyzes ticket descriptions using NLP{"\n"}
                  • Groups tickets by content similarity{"\n"}
                  • Identifies common issues and emerging problems{"\n"}
                  • Sample tickets show representative examples{"\n"}
                  • Use insights to create knowledge base articles{"\n"}
                  • High counts indicate areas needing attention
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {topics.map((topic, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
            >
              <div className="flex-1">
                <p className="font-medium">{topic.topic}</p>
                <p className="text-sm text-muted-foreground">
                  {topic.sample_ticket_ids.length} sample tickets
                </p>
              </div>
              <Badge variant="secondary">{topic.count}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
