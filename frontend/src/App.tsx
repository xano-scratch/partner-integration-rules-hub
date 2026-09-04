import { useCallback, useEffect, useState } from "react";
import type { PartnersData } from "@/lib/api";
import { api } from "@/lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PartnersScreen } from "@/screens/PartnersScreen";
import { SubmitScreen } from "@/screens/SubmitScreen";
import { RecordsScreen } from "@/screens/RecordsScreen";
import { LogScreen } from "@/screens/LogScreen";
import { RulesAdminScreen } from "@/screens/RulesAdminScreen";
import { Loader2, ShieldCheck, User } from "lucide-react";

type Role = "integration_admin" | "viewer";
type Session = { token: string; user: { id: number; email: string; name: string; role: string } };

const ACCOUNTS: Record<Role, { email: string; password: string }> = {
  integration_admin: { email: "admin@demo.test", password: "demo1234" },
  viewer: { email: "viewer@demo.test", password: "demo1234" },
};

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [data, setData] = useState<PartnersData | null>(null);
  const [tab, setTab] = useState("partners");
  const [bootError, setBootError] = useState<string | null>(null);

  // Ensure demo data exists (idempotent), then sign in as the admin.
  useEffect(() => {
    (async () => {
      try {
        await api.seed();
        const res = await api.login(ACCOUNTS.integration_admin);
        setSession({ token: String(res.token), user: res.user as Session["user"] });
      } catch (e) {
        setBootError((e as Error).message);
      }
    })();
  }, []);

  const refresh = useCallback(async () => {
    if (!session) return;
    try {
      setData(await api.partners(session.token));
    } catch {
      /* ignore */
    }
  }, [session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function switchRole(role: Role) {
    try {
      const res = await api.login(ACCOUNTS[role]);
      setSession({ token: String(res.token), user: res.user as Session["user"] });
    } catch (e) {
      setBootError((e as Error).message);
    }
  }

  if (bootError) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 p-8 text-center">
        <h1 className="text-xl font-semibold">Could not reach the backend</h1>
        <p className="text-sm text-muted-foreground">{bootError}</p>
        <p className="text-xs text-muted-foreground">
          Deploy the backend with <code className="rounded bg-muted px-1">npm run xano:deploy</code>, then reload.
        </p>
      </main>
    );
  }

  if (!session || !data) {
    return (
      <main className="flex min-h-screen items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" /> Loading the hub…
      </main>
    );
  }

  const isAdmin = session.user.role === "integration_admin";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" />
              <h1 className="text-lg font-semibold tracking-tight">Partner Integration Rules Hub</h1>
              <Badge variant="outline" className="text-[11px]">Play 1 · Business Logic Centralization</Badge>
            </div>
            <p className="pt-1 text-sm text-muted-foreground">
              One governed API normalizes every partner's records to a shared shape, then accepts or rejects them
              against that partner's own versioned rules, with a full audit trail.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm">
              <User className="size-4 text-muted-foreground" />
              <span className="font-medium">{session.user.name}</span>
              <Badge variant={isAdmin ? "default" : "secondary"} className="text-[11px]">{session.user.role}</Badge>
            </div>
            <div className="flex overflow-hidden rounded-md border">
              <Button
                variant={isAdmin ? "default" : "ghost"}
                size="sm"
                className="rounded-none"
                onClick={() => switchRole("integration_admin")}
              >
                Admin
              </Button>
              <Button
                variant={!isAdmin ? "default" : "ghost"}
                size="sm"
                className="rounded-none"
                onClick={() => switchRole("viewer")}
              >
                Viewer
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-5">
            <TabsTrigger value="partners">Partners</TabsTrigger>
            <TabsTrigger value="submit">Submit</TabsTrigger>
            <TabsTrigger value="records">Records</TabsTrigger>
            <TabsTrigger value="log">Log</TabsTrigger>
            <TabsTrigger value="admin">Rules admin</TabsTrigger>
          </TabsList>

          <TabsContent value="partners">
            <PartnersScreen data={data} />
          </TabsContent>
          <TabsContent value="submit">
            <SubmitScreen token={session.token} data={data} />
          </TabsContent>
          <TabsContent value="records">
            <RecordsScreen token={session.token} isAdmin={isAdmin} data={data} onDataChanged={refresh} />
          </TabsContent>
          <TabsContent value="log">
            <LogScreen token={session.token} data={data} />
          </TabsContent>
          <TabsContent value="admin">
            <RulesAdminScreen token={session.token} isAdmin={isAdmin} data={data} onDataChanged={refresh} />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="mx-auto max-w-6xl px-6 pb-8 pt-2 text-xs text-muted-foreground">
        Native Xano auth (auth table + token + per-endpoint role preconditions). RBAC is at the API layer,
        never row-level. Demo sign-in: admin@demo.test / viewer@demo.test, password demo1234.
      </footer>
    </div>
  );
}
