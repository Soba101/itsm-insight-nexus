import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { 
  Database, 
  Cloud, 
  Server, 
  CheckCircle2, 
  XCircle, 
  Brain, 
  User, 
  Palette,
  Bell,
  Keyboard,
  Eye,
  EyeOff,
  AlertCircle,
  Download,
  Upload
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Settings as SettingsType, UserPreferences, DEFAULT_USER_PREFERENCES } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { toast } = useToast();
  
  // System Settings State
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
  const [dataSourceConnected, setDataSourceConnected] = useState<boolean | null>(null);
  const [apiConnected, setApiConnected] = useState<boolean | null>(null);
  const [showAuthToken, setShowAuthToken] = useState(false);
  const [showDataSourceDialog, setShowDataSourceDialog] = useState(false);
  const [pendingDataSource, setPendingDataSource] = useState<"docker" | "supabase" | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isTestingDataSource, setIsTestingDataSource] = useState(false);
  const [isTestingApi, setIsTestingApi] = useState(false);
  
  // User Preferences State
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_USER_PREFERENCES);
  const [hasUnsavedPreferences, setHasUnsavedPreferences] = useState(false);

  useEffect(() => {
    // Load system settings
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
    
    // Load user preferences
    const storedPrefs = localStorage.getItem("itsm-user-preferences");
    if (storedPrefs) {
      setPreferences(JSON.parse(storedPrefs));
    }
    
    // Simulate connection check
    setIsConnected(true);
  }, []);
  
  // Track unsaved changes for system settings
  useEffect(() => {
    const stored = localStorage.getItem("itsm-settings");
    if (stored) {
      const parsedSettings = JSON.parse(stored);
      const hasChanges = JSON.stringify(settings) !== JSON.stringify(parsedSettings);
      setHasUnsavedChanges(hasChanges);
    }
  }, [settings]);
  
  // Track unsaved changes for user preferences
  useEffect(() => {
    const stored = localStorage.getItem("itsm-user-preferences");
    const storedPrefs = stored ? JSON.parse(stored) : DEFAULT_USER_PREFERENCES;
    const hasChanges = JSON.stringify(preferences) !== JSON.stringify(storedPrefs);
    setHasUnsavedPreferences(hasChanges);
  }, [preferences]);

  const handleSave = useCallback(() => {
    const dataSourceChanged = previousDataSource !== settings.dataSource;
    const nextSettings = { ...settings, aiEnabled: true };
    
    setSettings(nextSettings);
    localStorage.setItem("itsm-settings", JSON.stringify(nextSettings));
    setHasUnsavedChanges(false);
    
    if (dataSourceChanged) {
      toast({
        title: "Settings saved",
        description: "Data source changed. Reloading application...",
      });
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      toast({
        title: "Settings saved",
        description: "Your configuration has been updated successfully.",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previousDataSource, settings]);
  
  const handleSavePreferences = useCallback(() => {
    localStorage.setItem("itsm-user-preferences", JSON.stringify(preferences));
    setHasUnsavedPreferences(false);
    toast({
      title: "Preferences saved",
      description: "Your preferences have been updated successfully.",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferences]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (hasUnsavedChanges) {
          handleSave();
        }
        if (hasUnsavedPreferences) {
          handleSavePreferences();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasUnsavedChanges, hasUnsavedPreferences, handleSave, handleSavePreferences]);

  const handleResetPreferences = () => {
    setPreferences(DEFAULT_USER_PREFERENCES);
    localStorage.setItem("itsm-user-preferences", JSON.stringify(DEFAULT_USER_PREFERENCES));
    toast({
      title: "Preferences reset",
      description: "All preferences have been reset to default values.",
    });
  };

  const handleExportSettings = () => {
    const exportData = {
      settings,
      preferences,
      exportedAt: new Date().toISOString(),
      version: "1.0",
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `itsm-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({
      title: "Settings exported",
      description: "Your settings have been downloaded as JSON.",
    });
  };

  const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        if (imported.settings) {
          setSettings(imported.settings);
          localStorage.setItem("itsm-settings", JSON.stringify(imported.settings));
        }
        if (imported.preferences) {
          setPreferences(imported.preferences);
          localStorage.setItem("itsm-user-preferences", JSON.stringify(imported.preferences));
        }
        toast({
          title: "Settings imported",
          description: "Your settings have been restored successfully.",
        });
      } catch (error) {
        toast({
          title: "Import failed",
          description: "Invalid settings file format.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
    // Reset the input so the same file can be selected again
    event.target.value = "";
  };
  
  const handleDataSourceChange = (value: "docker" | "supabase") => {
    if (value !== settings.dataSource) {
      setPendingDataSource(value);
      setShowDataSourceDialog(true);
    }
  };
  
  const confirmDataSourceChange = () => {
    if (pendingDataSource) {
      setSettings({ ...settings, dataSource: pendingDataSource });
      setShowDataSourceDialog(false);
      setPendingDataSource(null);
    }
  };
  
  const validateUrl = (url: string): boolean => {
    if (!url) return false;
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
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
    
    if (!validateUrl(settings.aiBackendUrl)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL starting with http:// or https://",
        variant: "destructive",
      });
      return;
    }

    setIsTestingConnection(true);
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
    } finally {
      setIsTestingConnection(false);
    }
  };

  const testDataSourceConnection = async () => {
    if (!validateUrl(settings.apiBaseUrl)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid API Base URL",
        variant: "destructive",
      });
      return;
    }

    setIsTestingDataSource(true);
    try {
      const headers: HeadersInit = {};
      if (settings.authToken) {
        headers.Authorization = settings.authToken;
      }

      // Try to fetch a simple endpoint to test connection
      const response = await fetch(`${settings.apiBaseUrl}/servicenow_incidents?limit=1`, {
        headers,
      });
      
      if (response.ok) {
        setDataSourceConnected(true);
        toast({
          title: "Data Source Connected",
          description: `Successfully connected to ${settings.dataSource === "docker" ? "Docker PostgREST" : "Supabase"}`,
        });
      } else {
        setDataSourceConnected(false);
        toast({
          title: "Connection Failed",
          description: `Status: ${response.status} ${response.statusText}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      setDataSourceConnected(false);
      toast({
        title: "Connection Failed",
        description: "Could not reach data source. Make sure it's running.",
        variant: "destructive",
      });
    } finally {
      setIsTestingDataSource(false);
    }
  };

  const testApiConnection = async () => {
    // Test the auth API backend
    setIsTestingApi(true);
    try {
      const response = await fetch("http://localhost:3001/health");
      
      if (response.ok) {
        setApiConnected(true);
        toast({
          title: "Auth API Connected",
          description: "Successfully connected to authentication backend",
        });
      } else {
        setApiConnected(false);
        toast({
          title: "Connection Failed",
          description: `Status: ${response.status}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      setApiConnected(false);
      toast({
        title: "Connection Failed",
        description: "Could not reach auth API. Make sure backend-auth is running.",
        variant: "destructive",
      });
    } finally {
      setIsTestingApi(false);
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
    <div className="space-y-6 max-w-4xl pb-8">
      <div className="sticky top-0 z-10 bg-background pb-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">Configure your system and preferences</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Import/Export Buttons */}
            <input
              type="file"
              id="import-settings"
              accept=".json"
              className="hidden"
              onChange={handleImportSettings}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById("import-settings")?.click()}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Import
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportSettings}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
            
            {(hasUnsavedChanges || hasUnsavedPreferences) && (
              <Badge variant="outline" className="gap-2">
                <AlertCircle className="h-3 w-3" />
                Unsaved Changes
              </Badge>
            )}
            <Badge variant={isConnected ? "default" : "destructive"} className="gap-2">
              {isConnected ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <XCircle className="h-3 w-3" />
              )}
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
          </div>
        </div>
      </div>

      <Tabs defaultValue="preferences" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            My Preferences
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            System
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Account
          </TabsTrigger>
        </TabsList>

        {/* My Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6 mt-6">
          {/* Appearance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Appearance
              </CardTitle>
              <CardDescription>
                Customize how the application looks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <Select
                  value={preferences.theme}
                  onValueChange={(value: "light" | "dark" | "system") =>
                    setPreferences({ ...preferences, theme: value })
                  }
                >
                  <SelectTrigger id="theme">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* AI Features */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI Features
              </CardTitle>
              <CardDescription>
                Control which AI-powered features you want to use (client-side preferences)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 p-3 mb-4">
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  <strong>How it works:</strong> These toggles control UI behavior. The AI Backend must be running 
                  for features to work. Check "System" tab → "AI Backend Services" to verify connection.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Similar Tickets</Label>
                  <p className="text-sm text-muted-foreground">
                    Show similar tickets based on descriptions
                  </p>
                </div>
                <Switch
                  checked={preferences.enableSimilarTickets}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, enableSimilarTickets: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Duplicate Detection</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically detect potential duplicate tickets
                  </p>
                </div>
                <Switch
                  checked={preferences.enableDuplicateDetection}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, enableDuplicateDetection: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-Classification</Label>
                  <p className="text-sm text-muted-foreground">
                    AI suggests categories and assignments
                  </p>
                </div>
                <Switch
                  checked={preferences.enableAutoClassification}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, enableAutoClassification: checked })
                  }
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Similarity Threshold</Label>
                  <span className="text-sm text-muted-foreground">
                    {(preferences.similarityThreshold * 100).toFixed(0)}%
                  </span>
                </div>
                <Slider
                  value={[preferences.similarityThreshold]}
                  onValueChange={([value]) =>
                    setPreferences({ ...preferences, similarityThreshold: value })
                  }
                  min={0.5}
                  max={0.95}
                  step={0.05}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Higher values show only more similar tickets
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Display Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Display & Navigation</CardTitle>
              <CardDescription>
                Configure display settings and default views (stored locally)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-3 mb-4">
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  <strong>Note:</strong> These preferences are currently saved in your browser's localStorage. 
                  Backend synchronization will be added in Phase 4 to persist across devices.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="default-page">Default Page After Login</Label>
                <Select
                  value={preferences.defaultPage}
                  onValueChange={(value: "dashboard" | "tickets" | "insights" | "graph") =>
                    setPreferences({ ...preferences, defaultPage: value })
                  }
                >
                  <SelectTrigger id="default-page">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dashboard">Dashboard</SelectItem>
                    <SelectItem value="tickets">Tickets</SelectItem>
                    <SelectItem value="insights">Insights</SelectItem>
                    <SelectItem value="graph">Graph</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tickets-per-page">Tickets Per Page</Label>
                <Select
                  value={preferences.ticketsPerPage.toString()}
                  onValueChange={(value) =>
                    setPreferences({ ...preferences, ticketsPerPage: parseInt(value) as 10 | 25 | 50 | 100 })
                  }
                >
                  <SelectTrigger id="tickets-per-page">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date-format">Date Format</Label>
                <Select
                  value={preferences.dateFormat}
                  onValueChange={(value: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD") =>
                    setPreferences({ ...preferences, dateFormat: value })
                  }
                >
                  <SelectTrigger id="date-format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (US)</SelectItem>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (EU)</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (ISO)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Default Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Default Filters</CardTitle>
              <CardDescription>
                Set default filters applied when viewing tickets
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="default-date-range">Default Date Range</Label>
                <Select
                  value={preferences.defaultDateRange}
                  onValueChange={(value: string) =>
                    setPreferences({ ...preferences, defaultDateRange: value })
                  }
                >
                  <SelectTrigger id="default-date-range">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                    <SelectItem value="90d">Last 90 Days</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Default Status Filter</Label>
                <div className="flex flex-wrap gap-2">
                  {(["Open", "In Progress", "Resolved", "Closed"] as const).map((status) => (
                    <Badge
                      key={status}
                      variant={preferences.defaultStatus?.includes(status) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        const current = preferences.defaultStatus || [];
                        const updated = current.includes(status)
                          ? current.filter((s) => s !== status)
                          : [...current, status];
                        setPreferences({ ...preferences, defaultStatus: updated });
                      }}
                    >
                      {status}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Click to toggle status filters (empty = all statuses)
                </p>
              </div>

              <div className="space-y-2">
                <Label>Default Priority Filter</Label>
                <div className="flex flex-wrap gap-2">
                  {(["P1", "P2", "P3", "P4"] as const).map((priority) => (
                    <Badge
                      key={priority}
                      variant={preferences.defaultPriority?.includes(priority) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        const current = preferences.defaultPriority || [];
                        const updated = current.includes(priority)
                          ? current.filter((p) => p !== priority)
                          : [...current, priority];
                        setPreferences({ ...preferences, defaultPriority: updated });
                      }}
                    >
                      {priority}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Click to toggle priority filters (empty = all priorities)
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-2">
            <Button onClick={handleSavePreferences} disabled={!hasUnsavedPreferences}>
              Save Preferences
            </Button>
            <Button onClick={handleResetPreferences} variant="outline">
              Reset to Defaults
            </Button>
            {hasUnsavedPreferences && (
              <Badge variant="outline" className="gap-2">
                <AlertCircle className="h-3 w-3" />
                Unsaved changes
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs gap-1 ml-auto">
              <Keyboard className="h-3 w-3" />
              Ctrl+S / ⌘S to save
            </Badge>
          </div>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-6 mt-6">
          {/* Data Source */}
          <Card>
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
                  onValueChange={handleDataSourceChange}
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

              <div className="flex items-center gap-2">
                <Button 
                  onClick={testDataSourceConnection} 
                  variant="outline"
                  disabled={isTestingDataSource}
                >
                  {isTestingDataSource ? "Testing..." : "Test Connection"}
                </Button>
                {dataSourceConnected !== null && (
                  <Badge variant={dataSourceConnected ? "default" : "destructive"} className="gap-2">
                    {dataSourceConnected ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <XCircle className="h-3 w-3" />
                    )}
                    {dataSourceConnected ? "Connected" : "Failed"}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* API Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                API Configuration
              </CardTitle>
              <CardDescription>
                Configure connection to your ITSM API backend
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-url">API Base URL</Label>
                <Input
                  id="api-url"
                  placeholder="https://api.example.com"
                  value={settings.apiBaseUrl}
                  onChange={(e) => {
                    setSettings({ ...settings, apiBaseUrl: e.target.value });
                  }}
                  disabled={isApiConfigDisabled}
                  className={!validateUrl(settings.apiBaseUrl) && settings.apiBaseUrl ? "border-destructive" : ""}
                />
                {!validateUrl(settings.apiBaseUrl) && settings.apiBaseUrl && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Please enter a valid URL starting with http:// or https://
                  </p>
                )}
                {settings.dataSource === "docker" && (
                  <p className="text-xs text-muted-foreground">
                    For Docker PostgREST API, use: http://localhost:3000
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="auth-token">Authorization Token</Label>
                <div className="relative">
                  <Input
                    id="auth-token"
                    type={showAuthToken ? "text" : "password"}
                    placeholder="Bearer token or API key"
                    value={settings.authToken}
                    onChange={(e) =>
                      setSettings({ ...settings, authToken: e.target.value })
                    }
                    disabled={isApiConfigDisabled}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowAuthToken(!showAuthToken)}
                    disabled={isApiConfigDisabled}
                  >
                    {showAuthToken ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {settings.dataSource === "docker" && (
                  <p className="text-xs text-muted-foreground">
                    Docker Postgres doesn't require authentication by default
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button 
                  onClick={testApiConnection} 
                  variant="outline"
                  disabled={isTestingApi}
                >
                  {isTestingApi ? "Testing..." : "Test Auth API"}
                </Button>
                {apiConnected !== null && (
                  <Badge variant={apiConnected ? "default" : "destructive"} className="gap-2">
                    {apiConnected ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <XCircle className="h-3 w-3" />
                    )}
                    {apiConnected ? "Connected" : "Failed"}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* AI Backend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI Backend Services
              </CardTitle>
              <CardDescription>
                Configure AI/ML infrastructure for intelligent ticket processing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Connection Status Section */}
              <div className="rounded-lg border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">Service Status</p>
                    <p className="text-xs text-muted-foreground">
                      Python FastAPI + LM Studio
                    </p>
                  </div>
                  <Badge 
                    variant={aiConnected === true ? "default" : aiConnected === false ? "destructive" : "secondary"} 
                    className="gap-2"
                  >
                    {aiConnected === true ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" />
                        Connected
                      </>
                    ) : aiConnected === false ? (
                      <>
                        <XCircle className="h-3 w-3" />
                        Disconnected
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3 w-3" />
                        Unknown
                      </>
                    )}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ai-backend-url">Backend API URL</Label>
                  <Input
                    id="ai-backend-url"
                    placeholder="http://localhost:8000"
                    value={settings.aiBackendUrl || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, aiBackendUrl: e.target.value })
                    }
                    className={!validateUrl(settings.aiBackendUrl || "") && settings.aiBackendUrl ? "border-destructive" : ""}
                  />
                  {!validateUrl(settings.aiBackendUrl || "") && settings.aiBackendUrl && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Please enter a valid URL starting with http:// or https://
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button 
                    onClick={testAiConnection} 
                    variant="outline"
                    size="sm"
                    disabled={isTestingConnection}
                  >
                    {isTestingConnection ? "Testing..." : "Test Connection"}
                  </Button>
                  {aiConnected !== null && (
                    <Badge variant={aiConnected ? "default" : "destructive"} className="gap-2">
                      {aiConnected ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" />
                          Success
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3" />
                          Failed
                        </>
                      )}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Features Status */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Available Features</span>
                  <span className="text-xs text-muted-foreground">Status</span>
                </div>
                
                <div className="space-y-2">
                  {/* Similarity Search */}
                  <div className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <div>
                        <p className="text-sm font-medium">Similar Tickets</p>
                        <p className="text-xs text-muted-foreground">pgvector embeddings + cosine similarity</p>
                      </div>
                    </div>
                    <Badge variant="default" className="text-xs">Active</Badge>
                  </div>

                  {/* Ticket Family */}
                  <div className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <div>
                        <p className="text-sm font-medium">Ticket Relationships</p>
                        <p className="text-xs text-muted-foreground">Parent/child ticket detection</p>
                      </div>
                    </div>
                    <Badge variant="default" className="text-xs">Active</Badge>
                  </div>

                  {/* Embedding Generation */}
                  <div className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <div>
                        <p className="text-sm font-medium">Embedding Worker</p>
                        <p className="text-xs text-muted-foreground">Auto-vectorization via queue</p>
                      </div>
                    </div>
                    <Badge variant="default" className="text-xs">Active</Badge>
                  </div>

                  {/* Coming Soon */}
                  <div className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50 opacity-60">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Classification & Sentiment</p>
                        <p className="text-xs text-muted-foreground">AI-powered categorization</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">Planned</Badge>
                  </div>

                  <div className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50 opacity-60">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Duplicate Detection</p>
                        <p className="text-xs text-muted-foreground">Automated duplicate flagging</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">Planned</Badge>
                  </div>

                  <div className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50 opacity-60">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">RAG Knowledge Base</p>
                        <p className="text-xs text-muted-foreground">Retrieval-augmented generation</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">Planned</Badge>
                  </div>
                </div>
              </div>

              {/* Prerequisites */}
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 p-3 text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100 mb-2">Prerequisites</p>
                <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1 ml-4 list-disc">
                  <li>LM Studio running on http://localhost:1234 with embedding model loaded</li>
                  <li>Python backend (backend-python) running on port 8000</li>
                  <li>Postgres with pgvector extension enabled</li>
                  <li>Embedding worker container processing queue</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-2">
            <Button onClick={handleSave} disabled={!hasUnsavedChanges}>
              Save System Settings
            </Button>
            {hasUnsavedChanges && (
              <Badge variant="outline" className="gap-2">
                <AlertCircle className="h-3 w-3" />
                Unsaved changes
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs gap-1 ml-auto">
              <Keyboard className="h-3 w-3" />
              Ctrl+S / ⌘S to save
            </Badge>
          </div>
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-6 mt-6">
          {/* User Profile (Placeholder for future) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Manage your account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted p-4 text-sm">
                <p className="font-medium mb-2">Coming Soon</p>
                <p className="text-muted-foreground">
                  Profile management features including name, email, and avatar will be available in a future update.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Notifications (Placeholder) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>
                Configure notification preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications about ticket updates
                  </p>
                </div>
                <Switch
                  checked={preferences.enableNotifications}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, enableNotifications: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Ticket Assignments</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify when tickets are assigned to you
                  </p>
                </div>
                <Switch
                  checked={preferences.notifyOnAssignment}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, notifyOnAssignment: checked })
                  }
                  disabled={!preferences.enableNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Status Changes</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify when ticket status changes
                  </p>
                </div>
                <Switch
                  checked={preferences.notifyOnStatusChange}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, notifyOnStatusChange: checked })
                  }
                  disabled={!preferences.enableNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>SLA Breaches</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify about potential SLA violations
                  </p>
                </div>
                <Switch
                  checked={preferences.notifyOnSLABreach}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, notifyOnSLABreach: checked })
                  }
                  disabled={!preferences.enableNotifications}
                />
              </div>
            </CardContent>
          </Card>

          {/* Keyboard Shortcuts (Placeholder) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Keyboard className="h-5 w-5" />
                Keyboard Shortcuts
              </CardTitle>
              <CardDescription>
                Available keyboard shortcuts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center justify-between p-2 rounded bg-muted">
                  <span>Save Settings</span>
                  <Badge variant="secondary">Ctrl+S</Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-muted">
                  <span>Search</span>
                  <Badge variant="secondary">Ctrl+K</Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-muted">
                  <span>Navigate Tickets</span>
                  <Badge variant="secondary">Ctrl+T</Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-muted">
                  <span>Dashboard</span>
                  <Badge variant="secondary">Ctrl+D</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Data Source Change Confirmation Dialog */}
      <AlertDialog open={showDataSourceDialog} onOpenChange={setShowDataSourceDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Data Source Change</AlertDialogTitle>
            <AlertDialogDescription>
              Changing the data source will reload the application. Any unsaved changes will be lost.
              Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingDataSource(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDataSourceChange}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
