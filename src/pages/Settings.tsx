import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
  });
  const [previousDataSource, setPreviousDataSource] = useState<"docker" | "supabase">("docker");

  useEffect(() => {
    const stored = localStorage.getItem("itsm-settings");
    if (stored) {
      const parsedSettings = JSON.parse(stored);
      setSettings(parsedSettings);
      setPreviousDataSource(parsedSettings.dataSource);
    }
  }, []);

  const handleSave = () => {
    const dataSourceChanged = previousDataSource !== settings.dataSource;
    
    localStorage.setItem("itsm-settings", JSON.stringify(settings));
    
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

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Configure API connections and features</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Data Source</CardTitle>
          <CardDescription>
            Select your data source
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="data-source">Data Source</Label>
            <Select
              value={settings.dataSource}
              onValueChange={(value: "docker" | "supabase") =>
                setSettings({ ...settings, dataSource: value })
              }
            >
              <SelectTrigger id="data-source" className="w-full">
                <SelectValue placeholder="Select data source" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="supabase">Lovable Cloud Database (Supabase)</SelectItem>
                <SelectItem value="docker">Local API (Docker Postgres)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {getDataSourceDescription()}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Configuration</CardTitle>
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
    </div>
  );
}
