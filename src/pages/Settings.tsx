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
    apiBaseUrl: "",
    authToken: "",
    dataSource: "supabase",
  });

  useEffect(() => {
    const stored = localStorage.getItem("itsm-settings");
    if (stored) {
      setSettings(JSON.parse(stored));
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem("itsm-settings", JSON.stringify(settings));
    toast({
      title: "Settings saved",
      description: "Your configuration has been updated successfully.",
    });
  };

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
              onValueChange={(value: "local" | "supabase") =>
                setSettings({ ...settings, dataSource: value })
              }
            >
              <SelectTrigger id="data-source" className="w-full">
                <SelectValue placeholder="Select data source" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="supabase">Lovable Cloud Database</SelectItem>
                <SelectItem value="local">Local API</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {settings.dataSource === "supabase"
                ? "Using Lovable Cloud backend database"
                : "Using local API connection"}
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
              disabled={settings.dataSource === "supabase"}
            />
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
              disabled={settings.dataSource === "supabase"}
            />
          </div>

          <Button onClick={handleSave}>Save Settings</Button>
        </CardContent>
      </Card>
    </div>
  );
}
