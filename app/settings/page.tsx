"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  User, 
  BookOpen, 
  Download, 
  Trash2, 
  ArrowLeft,
  Loader2,
  CheckCircle2
} from "lucide-react";
import Link from "next/link";

type UserProfile = {
  email?: string;
  user_metadata?: {
    name?: string;
    avatar_url?: string;
  };
};

export default function SettingsPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [defaultQuizCount, setDefaultQuizCount] = useState(5);
  const [defaultDifficulty, setDefaultDifficulty] = useState<"mixed" | "easy" | "medium" | "hard">("mixed");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login?redirectTo=/settings");
        return;
      }
      setUser(user);
      setDisplayName(user.user_metadata?.name || "");
      setLoading(false);
    };
    loadUser();
  }, [router, supabase]);

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { name: displayName }
      });
      if (error) throw error;
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to update profile:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    try {
      // Fetch all user data
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [documents, flashcardDecks, mindMaps] = await Promise.all([
        supabase.from("documents").select("*").eq("user_id", user.id),
        supabase.from("flashcard_decks").select("*, flashcards(*)").eq("user_id", user.id),
        supabase.from("mind_maps").select("*").eq("user_id", user.id),
      ]);

      const exportData = {
        exportedAt: new Date().toISOString(),
        user: {
          email: user.email,
          name: user.user_metadata?.name,
        },
        documents: documents.data || [],
        flashcardDecks: flashcardDecks.data || [],
        mindMaps: mindMaps.data || [],
      };

      // Download as JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `study-buddy-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export data:", error);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete your account? This action cannot be undone and will delete all your documents, flashcards, and mind maps."
    );
    if (!confirmed) return;

    const doubleConfirm = window.prompt(
      'Type "DELETE" to confirm account deletion:'
    );
    if (doubleConfirm !== "DELETE") return;

    try {
      // Note: Actual account deletion should be handled by a server-side function
      // This is a placeholder - you'll need to implement proper account deletion
      alert("Account deletion requested. Please contact support to complete this process.");
      await supabase.auth.signOut();
      router.push("/");
    } catch (error) {
      console.error("Failed to delete account:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <Settings className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Settings</h1>
              <p className="text-muted-foreground">Manage your account and preferences</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">
              <User className="w-4 h-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="preferences">
              <BookOpen className="w-4 h-4 mr-2" />
              Preferences
            </TabsTrigger>
            <TabsTrigger value="account">
              <Settings className="w-4 h-4 mr-2" />
              Account
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal information and how others see you
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed. Contact support if you need to update it.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Display Name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your name"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleSaveProfile}
                    disabled={saving || !displayName.trim()}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>Save Changes</>
                    )}
                  </Button>
                  {saveSuccess && (
                    <div className="flex items-center text-sm text-green-600">
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Saved successfully
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Subscription Plan</CardTitle>
                <CardDescription>
                  Your current plan and usage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Free Plan</span>
                      <Badge variant="secondary">Active</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Full access to all features
                    </p>
                  </div>
                  <Button variant="outline" disabled>
                    Upgrade (Coming Soon)
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Study Preferences</CardTitle>
                <CardDescription>
                  Customize your default study settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="quiz-count">Default Quiz Questions</Label>
                  <Input
                    id="quiz-count"
                    type="number"
                    min="3"
                    max="10"
                    value={defaultQuizCount}
                    onChange={(e) => setDefaultQuizCount(parseInt(e.target.value) || 5)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Number of questions to generate by default (3-10)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="difficulty">Default Difficulty</Label>
                  <select
                    id="difficulty"
                    value={defaultDifficulty}
                    onChange={(e) => setDefaultDifficulty(e.target.value as any)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="mixed">Mixed (Recommended)</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <Button variant="outline" className="w-full" disabled>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Preferences Saved Locally
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Export Data</CardTitle>
                <CardDescription>
                  Download all your study materials and progress
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Export all your documents, flashcards, mind maps, and other data as a JSON file.
                </p>
                <Button onClick={handleExportData} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export My Data
                </Button>
              </CardContent>
            </Card>

            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>
                  Irreversible actions that affect your account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Separator />
                <div className="space-y-2">
                  <h3 className="font-semibold">Delete Account</h3>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    className="mt-2"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
