# Settings Page Redesign Proposal

**Date:** 2025-11-09
**Context:** Integrating with another software, need clear separation between system config and user preferences

---

## Problem Statement

Current Settings page mixes:

1. **System-level config** (data sources, backend URLs) - deployment concerns
2. **User preferences** - missing entirely
3. **Non-interactive "always enabled" AI toggle** - confusing

Since this integrates with other software, users need control over **their experience**, not infrastructure.

---

## Proposed Solution: Tabbed Settings

### Architecture

```
┌─────────────────────────────────────────┐
│  Settings                         [?]    │
├─────────────────────────────────────────┤
│  [System] [My Preferences] [Account]    │  ← Tabs
├─────────────────────────────────────────┤
│                                          │
│  Tab content here                        │
│                                          │
└─────────────────────────────────────────┘
```

---

## Tab 1: System (Admin/Advanced)

**Audience:** Admins, power users, initial setup
**When to show:** Always visible, or hide if user.role !== 'admin'

**Sections:**

1. **Data Source** (keep as-is, add confirmation dialog)
2. **API Configuration** (keep, add validation)
3. **AI Backend** (rename to "AI System Configuration")
   - Remove "always enabled" badge
   - Keep URL input and test button
   - Add admin toggle: "Enable AI features globally"
   - Move feature roadmap to a "Learn More" link

**Changes:**

```tsx
// Simplified AI Backend section
<Card>
  <CardHeader>
    <CardTitle>AI System Configuration</CardTitle>
    <CardDescription>
      Configure the AI backend service URL. Users can control AI features in their preferences.
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    <div className="flex items-center justify-between">
      <div>
        <Label>Enable AI Features Globally</Label>
        <p className="text-xs text-muted-foreground">
          Allow users to use AI-powered analysis features
        </p>
      </div>
      <Switch
        checked={settings.aiEnabled}
        onCheckedChange={(checked) =>
          setSettings({ ...settings, aiEnabled: checked })
        }
      />
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
        disabled={!settings.aiEnabled}
      />
    </div>

    <Button onClick={testAiConnection} variant="outline" disabled={!settings.aiEnabled}>
      Test Connection
    </Button>

    <Button variant="link" asChild>
      <a href="/docs/PHASE1_COMPLETE.md" target="_blank">
        View AI Backend Documentation
      </a>
    </Button>
  </CardContent>
</Card>
```

---

## Tab 2: My Preferences (NEW - Primary User Settings)

**Audience:** All users
**Purpose:** Control personal experience, defaults, AI feature usage

### Section 1: Display & Interface

```tsx
<Card>
  <CardHeader>
    <CardTitle>Display & Interface</CardTitle>
    <CardDescription>Customize how you view and interact with data</CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Theme */}
    <div className="flex items-center justify-between">
      <div>
        <Label>Theme</Label>
        <p className="text-xs text-muted-foreground">Light, dark, or system default</p>
      </div>
      <Select value={userPrefs.theme} onValueChange={(v) => setUserPrefs({...userPrefs, theme: v})}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="light">Light</SelectItem>
          <SelectItem value="dark">Dark</SelectItem>
          <SelectItem value="system">System</SelectItem>
        </SelectContent>
      </Select>
    </div>

    {/* Default Page */}
    <div className="flex items-center justify-between">
      <div>
        <Label>Default Page</Label>
        <p className="text-xs text-muted-foreground">Page to show after login</p>
      </div>
      <Select value={userPrefs.defaultPage} onValueChange={(v) => setUserPrefs({...userPrefs, defaultPage: v})}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="/dashboard">Dashboard</SelectItem>
          <SelectItem value="/tickets">Tickets</SelectItem>
          <SelectItem value="/insights">Insights</SelectItem>
          <SelectItem value="/graph">Graph</SelectItem>
        </SelectContent>
      </Select>
    </div>

    {/* Items per page */}
    <div className="flex items-center justify-between">
      <div>
        <Label>Tickets per Page</Label>
        <p className="text-xs text-muted-foreground">Number of tickets to show in lists</p>
      </div>
      <Select value={String(userPrefs.itemsPerPage)} onValueChange={(v) => setUserPrefs({...userPrefs, itemsPerPage: Number(v)})}>
        <SelectTrigger className="w-24">
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

    {/* Date format */}
    <div className="flex items-center justify-between">
      <div>
        <Label>Date Format</Label>
        <p className="text-xs text-muted-foreground">How dates are displayed</p>
      </div>
      <Select value={userPrefs.dateFormat} onValueChange={(v) => setUserPrefs({...userPrefs, dateFormat: v})}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
          <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
          <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </CardContent>
</Card>
```

### Section 2: AI Features (User-Level Control)

```tsx
<Card>
  <CardHeader>
    <CardTitle>AI-Powered Features</CardTitle>
    <CardDescription>
      Control how AI assists you with ticket analysis
      {!settings.aiEnabled && (
        <Badge variant="secondary" className="ml-2">Disabled by Admin</Badge>
      )}
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Similar Tickets */}
    <div className="flex items-center justify-between">
      <div>
        <Label>Show Similar Tickets</Label>
        <p className="text-xs text-muted-foreground">
          Automatically suggest similar tickets when viewing details
        </p>
      </div>
      <Switch
        checked={userPrefs.showSimilarTickets}
        onCheckedChange={(checked) =>
          setUserPrefs({ ...userPrefs, showSimilarTickets: checked })
        }
        disabled={!settings.aiEnabled}
      />
    </div>

    {/* Similarity Threshold */}
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Similarity Threshold</Label>
        <span className="text-sm text-muted-foreground">
          {(userPrefs.similarityThreshold * 100).toFixed(0)}%
        </span>
      </div>
      <Slider
        value={[userPrefs.similarityThreshold]}
        onValueChange={([value]) =>
          setUserPrefs({ ...userPrefs, similarityThreshold: value })
        }
        min={0.5}
        max={0.95}
        step={0.05}
        disabled={!settings.aiEnabled || !userPrefs.showSimilarTickets}
      />
      <p className="text-xs text-muted-foreground">
        Higher = stricter matching. Recommended: 70-80%
      </p>
    </div>

    {/* Number of suggestions */}
    <div className="flex items-center justify-between">
      <div>
        <Label>Similar Tickets to Show</Label>
        <p className="text-xs text-muted-foreground">Maximum number of suggestions</p>
      </div>
      <Select
        value={String(userPrefs.similarityTopK)}
        onValueChange={(v) =>
          setUserPrefs({ ...userPrefs, similarityTopK: Number(v) })
        }
        disabled={!settings.aiEnabled || !userPrefs.showSimilarTickets}
      >
        <SelectTrigger className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="3">3</SelectItem>
          <SelectItem value="5">5</SelectItem>
          <SelectItem value="10">10</SelectItem>
        </SelectContent>
      </Select>
    </div>

    {/* Duplicate Detection */}
    <div className="flex items-center justify-between">
      <div>
        <Label>Duplicate Detection Warnings</Label>
        <p className="text-xs text-muted-foreground">
          Alert me when creating a ticket that might be a duplicate
        </p>
      </div>
      <Switch
        checked={userPrefs.autoDetectDuplicates}
        onCheckedChange={(checked) =>
          setUserPrefs({ ...userPrefs, autoDetectDuplicates: checked })
        }
        disabled={!settings.aiEnabled}
      />
    </div>

    {/* AI Classifications */}
    <div className="flex items-center justify-between">
      <div>
        <Label>AI-Suggested Classifications</Label>
        <p className="text-xs text-muted-foreground">
          Show AI category/priority suggestions (when available)
        </p>
      </div>
      <Switch
        checked={userPrefs.enableAiClassifications}
        onCheckedChange={(checked) =>
          setUserPrefs({ ...userPrefs, enableAiClassifications: checked })
        }
        disabled={!settings.aiEnabled}
      />
    </div>
  </CardContent>
</Card>
```

### Section 3: Default Filters

```tsx
<Card>
  <CardHeader>
    <CardTitle>Default Filters & Views</CardTitle>
    <CardDescription>Set your preferred defaults when viewing tickets</CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Default ticket status */}
    <div className="space-y-2">
      <Label>Default Ticket Status</Label>
      <Select
        value={userPrefs.defaultTicketStatus || "all"}
        onValueChange={(v) =>
          setUserPrefs({ ...userPrefs, defaultTicketStatus: v })
        }
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="open">Open Only</SelectItem>
          <SelectItem value="in-progress">In Progress Only</SelectItem>
          <SelectItem value="unresolved">Open + In Progress</SelectItem>
        </SelectContent>
      </Select>
    </div>

    {/* Default date range */}
    <div className="space-y-2">
      <Label>Default Date Range</Label>
      <Select
        value={userPrefs.defaultDateRange}
        onValueChange={(v) =>
          setUserPrefs({ ...userPrefs, defaultDateRange: v })
        }
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7d">Last 7 Days</SelectItem>
          <SelectItem value="30d">Last 30 Days</SelectItem>
          <SelectItem value="90d">Last 90 Days</SelectItem>
          <SelectItem value="1y">Last Year</SelectItem>
          <SelectItem value="all">All Time</SelectItem>
        </SelectContent>
      </Select>
    </div>

    {/* Assignment group filter */}
    <div className="space-y-2">
      <Label>Favorite Assignment Groups</Label>
      <p className="text-xs text-muted-foreground">
        Quick-filter to these groups (comma-separated)
      </p>
      <Input
        placeholder="e.g., IT Support, Network, Database"
        value={userPrefs.favoriteGroups || ""}
        onChange={(e) =>
          setUserPrefs({ ...userPrefs, favoriteGroups: e.target.value })
        }
      />
    </div>
  </CardContent>
</Card>
```

### Section 4: Notifications (Future)

```tsx
<Card>
  <CardHeader>
    <CardTitle>Notifications</CardTitle>
    <CardDescription>Control how and when you're notified</CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    <Alert>
      <InfoIcon className="h-4 w-4" />
      <AlertDescription>
        Email notifications will be available in a future update.
      </AlertDescription>
    </Alert>

    {/* Browser notifications */}
    <div className="flex items-center justify-between">
      <div>
        <Label>Browser Notifications</Label>
        <p className="text-xs text-muted-foreground">Desktop alerts for important events</p>
      </div>
      <Switch
        checked={userPrefs.browserNotifications}
        onCheckedChange={(checked) =>
          setUserPrefs({ ...userPrefs, browserNotifications: checked })
        }
      />
    </div>

    {/* Alert thresholds */}
    <div className="flex items-center justify-between">
      <div>
        <Label>SLA Alert Threshold</Label>
        <p className="text-xs text-muted-foreground">
          Notify when SLA compliance drops below this %
        </p>
      </div>
      <Select
        value={String(userPrefs.slaAlertThreshold)}
        onValueChange={(v) =>
          setUserPrefs({ ...userPrefs, slaAlertThreshold: Number(v) })
        }
      >
        <SelectTrigger className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="70">70%</SelectItem>
          <SelectItem value="75">75%</SelectItem>
          <SelectItem value="80">80%</SelectItem>
          <SelectItem value="85">85%</SelectItem>
          <SelectItem value="90">90%</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </CardContent>
</Card>
```

---

## Tab 3: Account (User Profile)

**Sections:**

1. **Profile Information**
   - Name, email (read-only if SSO)
   - Avatar upload
   - Timezone

2. **Security**
   - Change password (if not SSO)
   - Active sessions
   - API tokens for integrations

3. **Data & Privacy**
   - Export my activity log
   - Delete my preferences (reset to defaults)

---

## TypeScript Types

```typescript
// src/lib/types.ts

// System-level settings (admin)
export interface Settings {
  apiBaseUrl: string;
  authToken: string;
  dataSource: "docker" | "supabase";
  aiBackendUrl?: string;
  aiEnabled?: boolean; // Global AI toggle (admin)
}

// User preferences (per-user)
export interface UserPreferences {
  // Display
  theme: "light" | "dark" | "system";
  defaultPage: "/dashboard" | "/tickets" | "/insights" | "/graph";
  itemsPerPage: 10 | 25 | 50 | 100;
  dateFormat: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";
  timezone?: string;

  // AI Features (user-level)
  showSimilarTickets: boolean;
  similarityThreshold: number; // 0.5 - 0.95
  similarityTopK: 3 | 5 | 10;
  autoDetectDuplicates: boolean;
  enableAiClassifications: boolean;

  // Defaults & Filters
  defaultTicketStatus?: "all" | "open" | "in-progress" | "unresolved";
  defaultDateRange: "7d" | "30d" | "90d" | "1y" | "all";
  favoriteGroups?: string; // comma-separated

  // Notifications
  browserNotifications: boolean;
  slaAlertThreshold: 70 | 75 | 80 | 85 | 90;
}

// Default values
export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: "system",
  defaultPage: "/dashboard",
  itemsPerPage: 25,
  dateFormat: "MM/DD/YYYY",
  showSimilarTickets: true,
  similarityThreshold: 0.75,
  similarityTopK: 5,
  autoDetectDuplicates: true,
  enableAiClassifications: true,
  defaultDateRange: "30d",
  browserNotifications: false,
  slaAlertThreshold: 80,
};
```

---

## Storage Strategy

```typescript
// System settings (localStorage for now, could be env vars)
localStorage.getItem("itsm-settings")

// User preferences (should be in backend DB per user)
// For now, localStorage with user ID:
localStorage.getItem(`itsm-user-prefs-${userId}`)

// Better: API endpoints
// GET  /api/users/me/preferences
// POST /api/users/me/preferences
```

---

## Migration Plan

### Phase 1: Refactor Current (2-3 hours)

1. Add Tabs component to Settings page
2. Move existing cards to "System" tab
3. Fix AI Backend section (remove "always enabled", add real toggle)
4. Add unsaved changes warning

### Phase 2: User Preferences (4-6 hours)

1. Create UserPreferences type
2. Build "My Preferences" tab UI
3. Wire up localStorage persistence
4. Apply preferences across app (theme, defaults, etc.)

### Phase 3: Backend Integration (Optional, 1-2 days)

1. Add `user_preferences` table to Postgres
2. Create API endpoints for CRUD
3. Migrate from localStorage to API
4. Add preferences to user context

---

## Answer to Your Questions

### "How can we improve this or should we just remove this?"

**Improve it by:**

1. Making the global AI toggle actually functional (not "always enabled")
2. Moving it to a "System" tab for admins
3. Adding **user-level** AI controls in "My Preferences" tab

**Don't remove it** - but reframe it:

- System/Admin: "Is AI backend available?" (URL, global toggle)
- User: "Do I want to use AI features?" (per-user toggles, thresholds)

### "What should the user be able to view and update?"

Since integrating with other software, users need:

**Must Have (Phase 1):**

- ✅ Theme preference
- ✅ Default page after login
- ✅ Tickets per page
- ✅ AI feature toggles (similar tickets, duplicates)
- ✅ Similarity threshold slider

**Should Have (Phase 2):**

- ✅ Default filters (status, date range)
- ✅ Date format preference
- ✅ Favorite assignment groups
- ✅ Notification preferences

**Nice to Have (Future):**

- Profile picture
- Timezone
- API tokens
- Export preferences
- Keyboard shortcuts customization

---

## Implementation Example: Tabs Structure

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Settings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings>({...});
  const [userPrefs, setUserPrefs] = useState<UserPreferences>({...});

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Configure system connections and your personal preferences
        </p>
      </div>

      <Tabs defaultValue="preferences" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="preferences">My Preferences</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        <TabsContent value="preferences" className="space-y-4">
          {/* Display & Interface Card */}
          {/* AI Features Card */}
          {/* Default Filters Card */}
          {/* Notifications Card */}
          <Button onClick={saveUserPrefs}>Save Preferences</Button>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          {/* Data Source Card */}
          {/* API Configuration Card */}
          {/* AI Backend Card (improved) */}
          <Button onClick={saveSystemSettings}>Save System Settings</Button>
        </TabsContent>

        <TabsContent value="account" className="space-y-4">
          {/* Profile Card */}
          {/* Security Card */}
          {/* Data & Privacy Card */}
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

## Recommendation

**Start with:** "My Preferences" tab with AI feature controls. This gives users immediate value and separates concerns properly.

**Keep:** System tab for admins with improved AI Backend section (remove "always enabled" confusion).

**Result:** Clear separation - admins configure infrastructure, users control their experience.

Would you like me to implement the tabbed structure and user preferences now?
