import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Database, Cloud, Server, CheckCircle2, XCircle, Brain } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings as SettingsType } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SettingsType>({
    apiBaseUrl: "http://localhost:3000",
    authToken: "",
    dataSource: "docker",
    aiBackendUrl: "http://localhost:8000",
    aiEnabled: true,
  });
  const [previousDataSource, setPreviousDataSource] = useState<"docker" | "supabase">("docker");
  const [isConnected, setIsConnected] = useState(false);
  const [aiConnected, setAiConnected] = useState<boolean | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("itsm-settings");
    if (stored) {
      const parsedSettings = JSON.parse(stored);
      setSettings({
        ...parsedSettings,
        aiBackendUrl: parsedSettings.aiBackendUrl || "http://localhost:8000",
        aiEnabled: true,
      });
      setPreviousDataSource(parsedSettings.dataSource);
    }
    // Simulate connection check
    setIsConnected(true);
  }, []);

  const handleSave = () => {
    const dataSourceChanged = previousDataSource !== settings.dataSource;
    const nextSettings = { ...settings, aiEnabled: true };
    
    setSettings(nextSettings);
    localStorage.setItem("itsm-settings", JSON.stringify(nextSettings));
    
    if (dataSourceChanged) {
      toast({
        title: "Settings saved",
        description: "Data source changed. Reloading application...",
      });
      // Reload after a short delay to show the toast
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      toast({
        title: "Settings saved",
        description: "Your configuration has been updated successfully.",
      });
    }
  };

  const testAiConnection = async () => {
    if (!settings.aiBackendUrl) {
      toast({
        title: "Error",
        description: "AI Backend URL is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const token = localStorage.getItem("auth-token");
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${settings.aiBackendUrl}/api/ai/health`, {
        headers,
      });
      
      if (response.ok) {
        const data = await response.json();
        setAiConnected(true);
        toast({
          title: "AI Backend Connected",
          description: `Successfully connected to ${data.service} v${data.version}`,
        });
      } else {
        setAiConnected(false);
        toast({
          title: "Connection Failed",
          description: `Status: ${response.status} ${response.statusText}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      setAiConnected(false);
      toast({
        title: "Connection Failed",
        description: "Could not reach AI backend. Make sure it's running.",
        variant: "destructive",
      });
    }
  };

  const getDataSourceDescription = () => {
    switch (settings.dataSource) {
      case "supabase":
        return "Connected to Lovable Cloud Database (Supabase) - Production ready database with real-time sync";
      case "docker":
        return "Connected to Local Docker Postgres (localhost:15432) - For local development and testing";
      default:
        return "";
    }
  };

  const isApiConfigDisabled = settings.dataSource === "supabase";

  const getDataSourceIcon = () => {
    switch (settings.dataSource) {
      case "supabase":
        return <Cloud className="h-5 w-5 text-primary" />;
      case "docker":
        return <Server className="h-5 w-5 text-accent" />;
      default:
        return <Database className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Configure API connections and features</p>
        </div>
        <Badge variant={isConnected ? "default" : "destructive"} className="gap-2">
          {isConnected ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : (
            <XCircle className="h-3 w-3" />
          )}
          {isConnected ? "Connected" : "Disconnected"}
        </Badge>
      </div>

      <Card className="transition-all duration-300 hover:shadow-lg border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getDataSourceIcon()}
            Data Source
          </CardTitle>
          <CardDescription>
            Select your data source for ticket management
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="data-source" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Data Source
            </Label>
            <Select
              value={settings.dataSource}
              onValueChange={(value: "docker" | "supabase") =>
                setSettings({ ...settings, dataSource: value })
              }
            >
              <SelectTrigger id="data-source" className="w-full bg-background">
                <SelectValue placeholder="Select data source" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="supabase" className="cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Cloud className="h-4 w-4" />
                    Lovable Cloud Database (Supabase)
                  </div>
                </SelectItem>
                <SelectItem value="docker" className="cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Server className="h-4 w-4" />
                    Local API (Docker Postgres)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {getDataSourceDescription()}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="transition-all duration-300 hover:shadow-lg border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            API Configuration
          </CardTitle>
          <CardDescription>
            Configure connection to your live ITSM API backend
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-url">API Base URL</Label>
            <Input
              id="api-url"
              placeholder="https://api.example.com"
              value={settings.apiBaseUrl}
              onChange={(e) =>
                setSettings({ ...settings, apiBaseUrl: e.target.value })
              }
              disabled={isApiConfigDisabled}
            />
            {settings.dataSource === "docker" && (
              <p className="text-xs text-muted-foreground">
                For Docker PostgREST API, use: http://localhost:3000
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="auth-token">Authorization Token</Label>
            <Input
              id="auth-token"
              type="password"
              placeholder="Bearer token or API key"
              value={settings.authToken}
              onChange={(e) =>
                setSettings({ ...settings, authToken: e.target.value })
              }
              disabled={isApiConfigDisabled}
            />
            {settings.dataSource === "docker" && (
              <p className="text-xs text-muted-foreground">
                Docker Postgres doesn't require authentication by default
              </p>
            )}
          </div>

          <Button onClick={handleSave}>Save Settings</Button>
        </CardContent>
      </Card>

      <Card className="transition-all duration-300 hover:shadow-lg border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Backend (Python FastAPI)
          </CardTitle>
          <CardDescription>
            Configure AI features: ticket classification, sentiment analysis, and RAG
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <p className="text-sm font-medium leading-none">AI Features</p>
              <p className="text-xs text-muted-foreground">
                AI-powered ticket analysis is always enabled for this workspace.
              </p>
            </div>
            <Badge variant="default" className="gap-2">
              <CheckCircle2 className="h-3 w-3" />
              Enabled
            </Badge>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-backend-url">AI Backend URL</Label>
            <Input
              id="ai-backend-url"
              placeholder="http://localhost:8000"
              value={settings.aiBackendUrl || ""}
              onChange={(e) =>
                setSettings({ ...settings, aiBackendUrl: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              Python FastAPI service for NLP and RAG features (default: http://localhost:8000)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              onClick={testAiConnection} 
              variant="outline"
            >
              Test Connection
            </Button>
            {aiConnected !== null && (
              <Badge variant={aiConnected ? "default" : "destructive"} className="gap-2">
                {aiConnected ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <XCircle className="h-3 w-3" />
                )}
                {aiConnected ? "Connected" : "Failed"}
              </Badge>
            )}
          </div>

          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="font-medium mb-1">Phase 1: Foundation ✅</p>
            <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
              <li>Health check endpoint</li>
              <li>JWT authentication</li>
              <li>CORS enabled</li>
            </ul>
            <p className="font-medium mt-2 mb-1">Coming Soon:</p>
            <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
              <li>Ticket classification</li>
              <li>Sentiment analysis</li>
              <li>Duplicate detection</li>
              <li>RAG knowledge base</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
