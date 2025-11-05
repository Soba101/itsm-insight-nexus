import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
        <CardTitle>Top Topics (NLP Analysis)</CardTitle>
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
