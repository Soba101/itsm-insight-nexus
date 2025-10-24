import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Settings as SettingsType } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SettingsType>({
    apiBaseUrl: "",
    authToken: "",
    useMockData: true,
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
            Toggle between mock data and live API connections
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="mock-mode">Use Mock Data</Label>
              <p className="text-sm text-muted-foreground">
                Use simulated data for testing and demonstrations
              </p>
            </div>
            <Switch
              id="mock-mode"
              checked={settings.useMockData}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, useMockData: checked })
              }
            />
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
              disabled={settings.useMockData}
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
              disabled={settings.useMockData}
            />
          </div>

          <Button onClick={handleSave}>Save Settings</Button>
        </CardContent>
      </Card>
    </div>
  );
}
