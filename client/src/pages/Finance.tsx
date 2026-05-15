import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import {
  LayoutDashboard, Receipt, Wallet, ArrowDownToLine, ArrowUpFromLine, FileBarChart,
  Plus, Trash2, Pencil, AlertTriangle, TrendingUp, TrendingDown, DollarSign, PiggyBank, BadgeDollarSign,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import type { Expense, PettyCashAccount, PettyCashTransaction, SupplierPayment, CustomerPayment, LC, Cad } from "@shared/schema";

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "expenses", label: "Expenses", icon: Receipt },
  { id: "petty-cash", label: "Petty Cash", icon: PiggyBank },
  { id: "payables", label: "Payables (A/P)", icon: ArrowDownToLine },
  { id: "receivables", label: "Receivables (A/R)", icon: ArrowUpFromLine },
  { id: "reports", label: "Reports", icon: FileBarChart },
] as const;

const EXPENSE_CATEGORIES = [
  "Office Rent", "Salaries & Wages", "Utilities", "Customs & Clearance",
  "Transportation", "Bank Charges", "Insurance", "Professional Fees",
  "Marketing", "Office Supplies", "Travel", "Other",
];

const PETTY_CATEGORIES = [
  "Allocation", "Office Supplies", "Transportation", "Port Charges",
  "Meals & Refreshment", "Communications", "Repairs", "Misc",
];

const PAYMENT_METHODS = ["Cash", "Bank Transfer", "Cheque", "Mobile Money", "LC Settlement", "CAD"];

const CURRENCY = (n: number | string, ccy = "ETB") => {
  const num = Number(n);
  return `${ccy} ${isFinite(num) ? num.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "0"}`;
};

export default function Finance() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("dashboard");

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        eyebrow="Finance Module"
        title="Financial Operations"
        description="Track expenses, manage petty cash, supplier payables and customer receivables — all in Ethiopian Birr."
      />

      <div className="flex flex-wrap gap-1 border-b">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            data-testid={`tab-finance-${t.id}`}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "dashboard" && <DashboardTab />}
      {tab === "expenses" && <ExpensesTab />}
      {tab === "petty-cash" && <PettyCashTab />}
      {tab === "payables" && <PayablesTab />}
      {tab === "receivables" && <ReceivablesTab />}
      {tab === "reports" && <ReportsTab />}
    </div>
  );
}

// =================== DASHBOARD ===================

function DashboardTab() {
  const { data: expenses = [] } = useQuery<Expense[]>({ queryKey: ["/api/finance/expenses"] });
  const { data: accounts = [] } = useQuery<PettyCashAccount[]>({ queryKey: ["/api/finance/petty-cash/accounts"] });
  const { data: payables = [] } = useQuery<SupplierPayment[]>({ queryKey: ["/api/finance/payables"] });
  const { data: receivables = [] } = useQuery<CustomerPayment[]>({ queryKey: ["/api/finance/receivables"] });
  const { data: lcs = [] } = useQuery<LC[]>({ queryKey: ["/api/lcs"] });
  const { data: cads = [] } = useQuery<Cad[]>({ queryKey: ["/api/export/cads"] });

  const totals = useMemo(() => {
    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amountEtb), 0);
    const totalAP = payables.reduce((s, p) => s + (Number(p.totalAmountEtb) - Number(p.paidAmountEtb)), 0);
    const totalAR = receivables.reduce((s, r) => s + (Number(r.totalAmountEtb) - Number(r.receivedAmountEtb)), 0);
    const pettyBalance = accounts.reduce((s, a) => s + Number(a.balanceEtb), 0);
    const importPurchases = lcs.reduce((s, l) => s + Number(l.fobValueUsd) + Number(l.freightValueUsd), 0);
    const exportSales = cads.reduce((s, c) => s + Number(c.totalContractUsd), 0);
    return { totalExpenses, totalAP, totalAR, pettyBalance, importPurchases, exportSales };
  }, [expenses, payables, receivables, accounts, lcs, cads]);

  const expenseByCategory = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of expenses) m.set(e.category, (m.get(e.category) ?? 0) + Number(e.amountEtb));
    return Array.from(m.entries()).map(([category, amount]) => ({ category, amount }));
  }, [expenses]);

  const COLORS = ["hsl(175,70%,38%)", "hsl(30,80%,55%)", "hsl(200,70%,50%)", "hsl(280,60%,55%)", "hsl(140,50%,45%)", "hsl(0,70%,55%)", "hsl(45,80%,50%)", "hsl(220,60%,55%)"];

  const lowBalanceAccounts = accounts.filter(a => Number(a.balanceEtb) < Number(a.lowBalanceThresholdEtb));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Expenses" value={CURRENCY(totals.totalExpenses)} icon={Receipt} subtitle="All approved expenses" />
        <MetricCard title="Outstanding A/P" value={CURRENCY(totals.totalAP)} icon={ArrowDownToLine} subtitle={`${payables.filter(p => p.status !== "Paid").length} open invoices`} />
        <MetricCard title="Outstanding A/R" value={CURRENCY(totals.totalAR)} icon={ArrowUpFromLine} subtitle={`${receivables.filter(r => r.status !== "Received").length} pending receipts`} />
        <MetricCard title="Petty Cash Balance" value={CURRENCY(totals.pettyBalance)} icon={PiggyBank} subtitle={`${accounts.length} active accounts`} />
      </div>

      {lowBalanceAccounts.length > 0 && (
        <Card className="border-amber-500/40">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Low petty cash balance</p>
              <p className="text-xs text-muted-foreground">
                {lowBalanceAccounts.map(a => `${a.holderName} (${CURRENCY(a.balanceEtb)})`).join(" · ")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Expenses by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expenseByCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No expense data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={expenseByCategory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="category" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => CURRENCY(v)} />
                  <Bar dataKey="amount" fill="hsl(175,70%,38%)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Trade Position</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Import Purchases</span>
              </div>
              <span className="text-sm font-semibold">USD {totals.importPurchases.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <BadgeDollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Export Sales</span>
              </div>
              <span className="text-sm font-semibold">USD {totals.exportSales.toLocaleString()}</span>
            </div>
            <div className="pt-3 border-t">
              <p className="text-xs text-muted-foreground mb-1">Net Trade (Sales − Purchases)</p>
              <p className={`text-lg font-bold ${totals.exportSales - totals.importPurchases >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                USD {(totals.exportSales - totals.importPurchases).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Expense Mix</CardTitle>
        </CardHeader>
        <CardContent>
          {expenseByCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No expense data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={expenseByCategory} dataKey="amount" nameKey="category" cx="50%" cy="50%" outerRadius={80} label={(e: any) => e.category}>
                  {expenseByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => CURRENCY(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// =================== EXPENSES ===================

type ExpenseForm = Partial<Expense>;
const emptyExpense: ExpenseForm = { expenseTitle: "", category: "Other", expenseDate: new Date().toISOString().slice(0, 10), amountEtb: "0", vatAmountEtb: "0", currency: "ETB", paymentMethod: "Cash", approvalStatus: "Approved" };

function ExpensesTab() {
  const { toast } = useToast();
  const { data: expenses = [], isLoading } = useQuery<Expense[]>({ queryKey: ["/api/finance/expenses"] });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState<ExpenseForm>(emptyExpense);

  const createMut = useMutation({
    mutationFn: (body: ExpenseForm) => apiRequest("POST", "/api/finance/expenses", body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/finance/expenses"] }); setOpen(false); toast({ title: "Expense recorded" }); },
    onError: (e: any) => toast({ title: "Could not save expense", description: String(e?.message || e), variant: "destructive" }),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: ExpenseForm }) => apiRequest("PATCH", `/api/finance/expenses/${id}`, body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/finance/expenses"] }); setOpen(false); toast({ title: "Expense updated" }); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/finance/expenses/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/finance/expenses"] }); toast({ title: "Expense deleted" }); },
  });

  const openCreate = () => { setEditing(null); setForm(emptyExpense); setOpen(true); };
  const openEdit = (e: Expense) => { setEditing(e); setForm(e); setOpen(true); };
  const submit = () => {
    if (!form.expenseTitle || !form.category || !form.expenseDate) {
      toast({ title: "Title, category and date are required", variant: "destructive" });
      return;
    }
    if (editing) updateMut.mutate({ id: editing.id, body: form });
    else createMut.mutate(form);
  };

  const total = expenses.reduce((s, e) => s + Number(e.amountEtb), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-lg font-semibold">Expense Manager</h2>
          <p className="text-xs text-muted-foreground">Total recorded: {CURRENCY(total)}</p>
        </div>
        <Button onClick={openCreate} data-testid="button-add-expense"><Plus className="h-4 w-4 mr-1" /> Add Expense</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-sm text-muted-foreground p-6">Loading…</p>
          ) : expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6 text-center">No expenses recorded yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">VAT</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map(e => (
                  <TableRow key={e.id} data-testid={`row-expense-${e.id}`}>
                    <TableCell className="text-xs">{e.expenseDate}</TableCell>
                    <TableCell className="font-medium text-sm">{e.expenseTitle}</TableCell>
                    <TableCell><Badge variant="secondary">{e.category}</Badge></TableCell>
                    <TableCell className="text-xs">{e.paymentMethod}</TableCell>
                    <TableCell className="text-right font-semibold">{CURRENCY(e.amountEtb)}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">{CURRENCY(e.vatAmountEtb ?? 0)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(e)} data-testid={`button-edit-expense-${e.id}`}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => deleteMut.mutate(e.id)} data-testid={`button-delete-expense-${e.id}`}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Edit Expense" : "New Expense"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2"><Label>Title</Label><Input data-testid="input-expense-title" value={form.expenseTitle ?? ""} onChange={e => setForm({ ...form, expenseTitle: e.target.value })} /></div>
            <div><Label>Category</Label>
              <Select value={form.category ?? "Other"} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger data-testid="select-expense-category"><SelectValue /></SelectTrigger>
                <SelectContent>{EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Date</Label><Input type="date" data-testid="input-expense-date" value={form.expenseDate ?? ""} onChange={e => setForm({ ...form, expenseDate: e.target.value })} /></div>
            <div><Label>Amount (ETB)</Label><Input type="number" data-testid="input-expense-amount" value={form.amountEtb ?? "0"} onChange={e => setForm({ ...form, amountEtb: e.target.value })} /></div>
            <div><Label>VAT (ETB)</Label><Input type="number" data-testid="input-expense-vat" value={form.vatAmountEtb ?? "0"} onChange={e => setForm({ ...form, vatAmountEtb: e.target.value })} /></div>
            <div><Label>Payment Method</Label>
              <Select value={form.paymentMethod ?? "Cash"} onValueChange={v => setForm({ ...form, paymentMethod: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_METHODS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Department</Label><Input value={form.department ?? ""} onChange={e => setForm({ ...form, department: e.target.value })} /></div>
            <div><Label>Paid By</Label><Input value={form.paidBy ?? ""} onChange={e => setForm({ ...form, paidBy: e.target.value })} /></div>
            <div><Label>Reference Number</Label><Input value={form.referenceNumber ?? ""} onChange={e => setForm({ ...form, referenceNumber: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Description</Label><Textarea value={form.description ?? ""} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={createMut.isPending || updateMut.isPending} data-testid="button-save-expense">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =================== PETTY CASH ===================

function PettyCashTab() {
  const { toast } = useToast();
  const { data: accounts = [] } = useQuery<PettyCashAccount[]>({ queryKey: ["/api/finance/petty-cash/accounts"] });
  const { data: allTxns = [] } = useQuery<PettyCashTransaction[]>({ queryKey: ["/api/finance/petty-cash/transactions"] });

  const [accountOpen, setAccountOpen] = useState(false);
  const [accountForm, setAccountForm] = useState<Partial<PettyCashAccount>>({ holderName: "", assignedAmountEtb: "0", lowBalanceThresholdEtb: "1000", status: "Active" });
  const [txnOpen, setTxnOpen] = useState(false);
  const [txnForm, setTxnForm] = useState<Partial<PettyCashTransaction>>({ transactionType: "debit", amountEtb: "0", category: "Office Supplies", transactionDate: new Date().toISOString().slice(0, 10) });

  const createAccount = useMutation({
    mutationFn: (b: Partial<PettyCashAccount>) => apiRequest("POST", "/api/finance/petty-cash/accounts", b),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/finance/petty-cash/accounts"] }); setAccountOpen(false); toast({ title: "Account created" }); },
  });
  const deleteAccount = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/finance/petty-cash/accounts/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/finance/petty-cash/accounts"] }); toast({ title: "Account deleted" }); },
  });
  const createTxn = useMutation({
    mutationFn: (b: Partial<PettyCashTransaction>) => apiRequest("POST", "/api/finance/petty-cash/transactions", b),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/petty-cash/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/petty-cash/transactions"] });
      setTxnOpen(false);
      toast({ title: "Transaction posted" });
    },
    onError: (e: any) => toast({ title: "Transaction failed", description: String(e?.message || e), variant: "destructive" }),
  });

  const openTxn = (accountId: string) => {
    setTxnForm({ accountId, transactionType: "debit", amountEtb: "0", category: "Office Supplies", transactionDate: new Date().toISOString().slice(0, 10) });
    setTxnOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h2 className="text-lg font-semibold">Petty Cash Manager</h2>
        <Button onClick={() => { setAccountForm({ holderName: "", assignedAmountEtb: "0", lowBalanceThresholdEtb: "1000", status: "Active" }); setAccountOpen(true); }} data-testid="button-add-petty-account">
          <Plus className="h-4 w-4 mr-1" /> New Account
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {accounts.length === 0 && <Card><CardContent className="p-6 text-sm text-muted-foreground text-center">No petty cash accounts yet</CardContent></Card>}
        {accounts.map(a => {
          const balance = Number(a.balanceEtb);
          const assigned = Number(a.assignedAmountEtb);
          const threshold = Number(a.lowBalanceThresholdEtb);
          const pct = assigned > 0 ? Math.min(100, Math.max(0, (balance / assigned) * 100)) : 0;
          const low = balance < threshold;
          const txns = allTxns.filter(t => t.accountId === a.id).sort((x, y) => y.transactionDate.localeCompare(x.transactionDate)).slice(0, 5);
          return (
            <Card key={a.id} data-testid={`card-petty-${a.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{a.holderName}</CardTitle>
                    <p className="text-xs text-muted-foreground">{a.department || "—"}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => openTxn(a.id)} data-testid={`button-petty-txn-${a.id}`}><Plus className="h-3 w-3 mr-1" /> Txn</Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteAccount.mutate(a.id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Balance</span>
                    <span className={`font-semibold ${low ? "text-amber-600" : "text-emerald-600"}`}>{CURRENCY(balance)}</span>
                  </div>
                  <Progress value={pct} />
                  <p className="text-xs text-muted-foreground mt-1">Assigned: {CURRENCY(assigned)} · Threshold: {CURRENCY(threshold)}</p>
                  {low && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600">
                      <AlertTriangle className="h-3 w-3" /> Below low-balance threshold
                    </div>
                  )}
                </div>
                <div className="border-t pt-2">
                  <p className="text-xs font-medium mb-1">Recent activity</p>
                  {txns.length === 0 ? <p className="text-xs text-muted-foreground">No transactions yet</p> : (
                    <div className="space-y-1">
                      {txns.map(t => (
                        <div key={t.id} className="flex items-center justify-between text-xs">
                          <span className="truncate">
                            <span className="text-muted-foreground">{t.transactionDate}</span> · {t.purpose || t.category}
                          </span>
                          <span className={t.transactionType === "credit" ? "text-emerald-600 font-medium" : "text-red-500 font-medium"}>
                            {t.transactionType === "credit" ? "+" : "−"}{CURRENCY(t.amountEtb)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Account dialog */}
      <Dialog open={accountOpen} onOpenChange={setAccountOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Petty Cash Account</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2"><Label>Holder Name</Label><Input data-testid="input-petty-holder" value={accountForm.holderName ?? ""} onChange={e => setAccountForm({ ...accountForm, holderName: e.target.value })} /></div>
            <div><Label>Department</Label><Input value={accountForm.department ?? ""} onChange={e => setAccountForm({ ...accountForm, department: e.target.value })} /></div>
            <div><Label>Assigned Amount (ETB)</Label><Input type="number" data-testid="input-petty-assigned" value={accountForm.assignedAmountEtb ?? "0"} onChange={e => setAccountForm({ ...accountForm, assignedAmountEtb: e.target.value })} /></div>
            <div><Label>Low Balance Threshold</Label><Input type="number" value={accountForm.lowBalanceThresholdEtb ?? "1000"} onChange={e => setAccountForm({ ...accountForm, lowBalanceThresholdEtb: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAccountOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              if (!accountForm.holderName) { toast({ title: "Holder name required", variant: "destructive" }); return; }
              createAccount.mutate({ ...accountForm, balanceEtb: accountForm.assignedAmountEtb ?? "0" });
            }} data-testid="button-save-petty-account">Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction dialog */}
      <Dialog open={txnOpen} onOpenChange={setTxnOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Petty Cash Transaction</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>Type</Label>
              <Select value={txnForm.transactionType ?? "debit"} onValueChange={v => setTxnForm({ ...txnForm, transactionType: v })}>
                <SelectTrigger data-testid="select-petty-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">Credit (Top-up)</SelectItem>
                  <SelectItem value="debit">Debit (Spend)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Date</Label><Input type="date" value={txnForm.transactionDate ?? ""} onChange={e => setTxnForm({ ...txnForm, transactionDate: e.target.value })} /></div>
            <div><Label>Amount (ETB)</Label><Input type="number" data-testid="input-petty-amount" value={txnForm.amountEtb ?? "0"} onChange={e => setTxnForm({ ...txnForm, amountEtb: e.target.value })} /></div>
            <div><Label>Category</Label>
              <Select value={txnForm.category ?? "Office Supplies"} onValueChange={v => setTxnForm({ ...txnForm, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PETTY_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2"><Label>Purpose</Label><Input value={txnForm.purpose ?? ""} onChange={e => setTxnForm({ ...txnForm, purpose: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Remarks</Label><Textarea value={txnForm.remarks ?? ""} onChange={e => setTxnForm({ ...txnForm, remarks: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTxnOpen(false)}>Cancel</Button>
            <Button onClick={() => createTxn.mutate(txnForm)} disabled={createTxn.isPending} data-testid="button-save-petty-txn">Post</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =================== A/P (PAYABLES) ===================

function statusVariant(s: string): "default" | "secondary" | "destructive" | "outline" {
  if (s === "Paid" || s === "Received") return "default";
  if (s === "Partial") return "secondary";
  if (s === "Overdue") return "destructive";
  return "outline";
}

function PayablesTab() {
  const { toast } = useToast();
  const { data: payables = [] } = useQuery<SupplierPayment[]>({ queryKey: ["/api/finance/payables"] });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierPayment | null>(null);
  const [form, setForm] = useState<Partial<SupplierPayment>>({});

  const createMut = useMutation({
    mutationFn: (b: Partial<SupplierPayment>) => apiRequest("POST", "/api/finance/payables", b),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/finance/payables"] }); setOpen(false); toast({ title: "Payable saved" }); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<SupplierPayment> }) => apiRequest("PATCH", `/api/finance/payables/${id}`, body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/finance/payables"] }); setOpen(false); toast({ title: "Payable updated" }); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/finance/payables/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/finance/payables"] }); toast({ title: "Payable deleted" }); },
  });

  const openCreate = () => { setEditing(null); setForm({ supplierName: "", totalAmountEtb: "0", paidAmountEtb: "0", currency: "ETB", status: "Pending" }); setOpen(true); };
  const openEdit = (p: SupplierPayment) => { setEditing(p); setForm(p); setOpen(true); };
  const submit = () => {
    if (!form.supplierName) { toast({ title: "Supplier name required", variant: "destructive" }); return; }
    if (editing) updateMut.mutate({ id: editing.id, body: form });
    else createMut.mutate(form);
  };

  const totalOutstanding = payables.reduce((s, p) => s + (Number(p.totalAmountEtb) - Number(p.paidAmountEtb)), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-lg font-semibold">Accounts Payable</h2>
          <p className="text-xs text-muted-foreground">Outstanding: {CURRENCY(totalOutstanding)}</p>
        </div>
        <Button onClick={openCreate} data-testid="button-add-payable"><Plus className="h-4 w-4 mr-1" /> Add Payable</Button>
      </div>

      <Card><CardContent className="p-0">
        {payables.length === 0 ? <p className="text-sm text-muted-foreground p-6 text-center">No payables yet</p> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payables.map(p => {
                const outstanding = Number(p.totalAmountEtb) - Number(p.paidAmountEtb);
                return (
                  <TableRow key={p.id} data-testid={`row-payable-${p.id}`}>
                    <TableCell className="font-medium text-sm">{p.supplierName}</TableCell>
                    <TableCell className="text-xs">{p.invoiceNumber || "—"}</TableCell>
                    <TableCell className="text-xs">{p.dueDate || "—"}</TableCell>
                    <TableCell className="text-right text-sm">{CURRENCY(p.totalAmountEtb, p.currency ?? "ETB")}</TableCell>
                    <TableCell className="text-right text-sm">{CURRENCY(p.paidAmountEtb ?? 0, p.currency ?? "ETB")}</TableCell>
                    <TableCell className="text-right text-sm font-semibold">{CURRENCY(outstanding, p.currency ?? "ETB")}</TableCell>
                    <TableCell><Badge variant={statusVariant(p.status ?? "Pending")}>{p.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(p)} data-testid={`button-edit-payable-${p.id}`}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => deleteMut.mutate(p.id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Edit Payable" : "New Payable"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2"><Label>Supplier Name</Label><Input data-testid="input-payable-supplier" value={form.supplierName ?? ""} onChange={e => setForm({ ...form, supplierName: e.target.value })} /></div>
            <div><Label>Invoice #</Label><Input value={form.invoiceNumber ?? ""} onChange={e => setForm({ ...form, invoiceNumber: e.target.value })} /></div>
            <div><Label>Invoice Date</Label><Input type="date" value={form.invoiceDate ?? ""} onChange={e => setForm({ ...form, invoiceDate: e.target.value })} /></div>
            <div><Label>Due Date</Label><Input type="date" value={form.dueDate ?? ""} onChange={e => setForm({ ...form, dueDate: e.target.value })} /></div>
            <div><Label>Paid Date</Label><Input type="date" value={form.paidDate ?? ""} onChange={e => setForm({ ...form, paidDate: e.target.value })} /></div>
            <div><Label>Total Amount</Label><Input type="number" data-testid="input-payable-total" value={form.totalAmountEtb ?? "0"} onChange={e => setForm({ ...form, totalAmountEtb: e.target.value })} /></div>
            <div><Label>Paid Amount</Label><Input type="number" data-testid="input-payable-paid" value={form.paidAmountEtb ?? "0"} onChange={e => setForm({ ...form, paidAmountEtb: e.target.value })} /></div>
            <div><Label>Currency</Label>
              <Select value={form.currency ?? "ETB"} onValueChange={v => setForm({ ...form, currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["ETB", "USD", "EUR", "AED", "CNY"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Payment Method</Label>
              <Select value={form.paymentMethod ?? "Bank Transfer"} onValueChange={v => setForm({ ...form, paymentMethod: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_METHODS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Status</Label>
              <Select value={form.status ?? "Pending"} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Pending", "Partial", "Paid", "Overdue"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2"><Label>Notes</Label><Textarea value={form.notes ?? ""} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} data-testid="button-save-payable">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =================== A/R (RECEIVABLES) ===================

function ReceivablesTab() {
  const { toast } = useToast();
  const { data: receivables = [] } = useQuery<CustomerPayment[]>({ queryKey: ["/api/finance/receivables"] });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerPayment | null>(null);
  const [form, setForm] = useState<Partial<CustomerPayment>>({});

  const createMut = useMutation({
    mutationFn: (b: Partial<CustomerPayment>) => apiRequest("POST", "/api/finance/receivables", b),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/finance/receivables"] }); setOpen(false); toast({ title: "Receivable saved" }); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<CustomerPayment> }) => apiRequest("PATCH", `/api/finance/receivables/${id}`, body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/finance/receivables"] }); setOpen(false); toast({ title: "Receivable updated" }); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/finance/receivables/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/finance/receivables"] }); toast({ title: "Receivable deleted" }); },
  });

  const openCreate = () => { setEditing(null); setForm({ buyerName: "", totalAmountEtb: "0", receivedAmountEtb: "0", currency: "ETB", status: "Pending" }); setOpen(true); };
  const openEdit = (p: CustomerPayment) => { setEditing(p); setForm(p); setOpen(true); };
  const submit = () => {
    if (!form.buyerName) { toast({ title: "Buyer name required", variant: "destructive" }); return; }
    if (editing) updateMut.mutate({ id: editing.id, body: form });
    else createMut.mutate(form);
  };

  const totalOutstanding = receivables.reduce((s, p) => s + (Number(p.totalAmountEtb) - Number(p.receivedAmountEtb)), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-lg font-semibold">Accounts Receivable</h2>
          <p className="text-xs text-muted-foreground">Outstanding: {CURRENCY(totalOutstanding)}</p>
        </div>
        <Button onClick={openCreate} data-testid="button-add-receivable"><Plus className="h-4 w-4 mr-1" /> Add Receivable</Button>
      </div>

      <Card><CardContent className="p-0">
        {receivables.length === 0 ? <p className="text-sm text-muted-foreground p-6 text-center">No receivables yet</p> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Buyer</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Received</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receivables.map(p => {
                const outstanding = Number(p.totalAmountEtb) - Number(p.receivedAmountEtb);
                return (
                  <TableRow key={p.id} data-testid={`row-receivable-${p.id}`}>
                    <TableCell className="font-medium text-sm">{p.buyerName}</TableCell>
                    <TableCell className="text-xs">{p.invoiceNumber || "—"}</TableCell>
                    <TableCell className="text-xs">{p.dueDate || "—"}</TableCell>
                    <TableCell className="text-right text-sm">{CURRENCY(p.totalAmountEtb, p.currency ?? "ETB")}</TableCell>
                    <TableCell className="text-right text-sm">{CURRENCY(p.receivedAmountEtb ?? 0, p.currency ?? "ETB")}</TableCell>
                    <TableCell className="text-right text-sm font-semibold">{CURRENCY(outstanding, p.currency ?? "ETB")}</TableCell>
                    <TableCell><Badge variant={statusVariant(p.status ?? "Pending")}>{p.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(p)} data-testid={`button-edit-receivable-${p.id}`}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => deleteMut.mutate(p.id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Edit Receivable" : "New Receivable"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2"><Label>Buyer Name</Label><Input data-testid="input-receivable-buyer" value={form.buyerName ?? ""} onChange={e => setForm({ ...form, buyerName: e.target.value })} /></div>
            <div><Label>Invoice #</Label><Input value={form.invoiceNumber ?? ""} onChange={e => setForm({ ...form, invoiceNumber: e.target.value })} /></div>
            <div><Label>Invoice Date</Label><Input type="date" value={form.invoiceDate ?? ""} onChange={e => setForm({ ...form, invoiceDate: e.target.value })} /></div>
            <div><Label>Due Date</Label><Input type="date" value={form.dueDate ?? ""} onChange={e => setForm({ ...form, dueDate: e.target.value })} /></div>
            <div><Label>Received Date</Label><Input type="date" value={form.receivedDate ?? ""} onChange={e => setForm({ ...form, receivedDate: e.target.value })} /></div>
            <div><Label>Total Amount</Label><Input type="number" data-testid="input-receivable-total" value={form.totalAmountEtb ?? "0"} onChange={e => setForm({ ...form, totalAmountEtb: e.target.value })} /></div>
            <div><Label>Received Amount</Label><Input type="number" data-testid="input-receivable-received" value={form.receivedAmountEtb ?? "0"} onChange={e => setForm({ ...form, receivedAmountEtb: e.target.value })} /></div>
            <div><Label>Currency</Label>
              <Select value={form.currency ?? "ETB"} onValueChange={v => setForm({ ...form, currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["ETB", "USD", "EUR", "AED", "CNY"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Payment Method</Label>
              <Select value={form.paymentMethod ?? "CAD"} onValueChange={v => setForm({ ...form, paymentMethod: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_METHODS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Status</Label>
              <Select value={form.status ?? "Pending"} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Pending", "Partial", "Received", "Overdue"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2"><Label>Notes</Label><Textarea value={form.notes ?? ""} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} data-testid="button-save-receivable">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =================== REPORTS ===================

function ReportsTab() {
  const { data: expenses = [] } = useQuery<Expense[]>({ queryKey: ["/api/finance/expenses"] });
  const { data: payables = [] } = useQuery<SupplierPayment[]>({ queryKey: ["/api/finance/payables"] });
  const { data: receivables = [] } = useQuery<CustomerPayment[]>({ queryKey: ["/api/finance/receivables"] });
  const { data: lcs = [] } = useQuery<LC[]>({ queryKey: ["/api/lcs"] });
  const { data: cads = [] } = useQuery<Cad[]>({ queryKey: ["/api/export/cads"] });

  const totalExpensesEtb = expenses.reduce((s, e) => s + Number(e.amountEtb), 0);
  const totalVat = expenses.reduce((s, e) => s + Number(e.vatAmountEtb ?? 0), 0);
  const totalAP = payables.reduce((s, p) => s + (Number(p.totalAmountEtb) - Number(p.paidAmountEtb)), 0);
  const totalAR = receivables.reduce((s, r) => s + (Number(r.totalAmountEtb) - Number(r.receivedAmountEtb)), 0);

  // Build monthly trend from expenses + receivables (received)
  const monthly = useMemo(() => {
    const map = new Map<string, { month: string; inflow: number; outflow: number }>();
    const ensure = (m: string) => { if (!map.has(m)) map.set(m, { month: m, inflow: 0, outflow: 0 }); return map.get(m)!; };
    for (const e of expenses) if (e.expenseDate) ensure(e.expenseDate.slice(0, 7)).outflow += Number(e.amountEtb);
    for (const r of receivables) if (r.receivedDate) ensure(r.receivedDate.slice(0, 7)).inflow += Number(r.receivedAmountEtb ?? 0);
    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [expenses, receivables]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Financial Reports</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Expenses" value={CURRENCY(totalExpensesEtb)} icon={Receipt} subtitle={`${expenses.length} entries`} />
        <MetricCard title="VAT Paid" value={CURRENCY(totalVat)} icon={DollarSign} subtitle="On taxable expenses" />
        <MetricCard title="A/P Outstanding" value={CURRENCY(totalAP)} icon={ArrowDownToLine} subtitle={`${payables.length} payables`} />
        <MetricCard title="A/R Outstanding" value={CURRENCY(totalAR)} icon={ArrowUpFromLine} subtitle={`${receivables.length} receivables`} />
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Cash Flow Trend</CardTitle></CardHeader>
        <CardContent>
          {monthly.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Not enough dated activity yet to plot a trend</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => CURRENCY(v)} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="inflow" stroke="hsl(175,70%,38%)" name="Inflow" strokeWidth={2} />
                <Line type="monotone" dataKey="outflow" stroke="hsl(0,72%,50%)" name="Outflow" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Import LC Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Open LCs</span><span className="font-medium">{lcs.filter(l => l.status !== "Closed" && l.status !== "Settled").length}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total FOB Value</span><span className="font-medium">USD {lcs.reduce((s, l) => s + Number(l.fobValueUsd), 0).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total Freight</span><span className="font-medium">USD {lcs.reduce((s, l) => s + Number(l.freightValueUsd), 0).toLocaleString()}</span></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Export CAD Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Active CADs</span><span className="font-medium">{cads.filter(c => c.paidStatus !== "paid").length}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total Contract Value</span><span className="font-medium">USD {cads.reduce((s, c) => s + Number(c.totalContractUsd), 0).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">NBE Retention (avg)</span><span className="font-medium">{cads.length ? (cads.reduce((s, c) => s + Number(c.nbeRetentionPct), 0) / cads.length).toFixed(1) : 0}%</span></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
