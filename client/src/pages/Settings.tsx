import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Building2, BanknoteIcon, Users, UserCheck, Award, Bell, Trash2, Plus, Pencil, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ETHIOPIAN_BANKS, swiftForBank } from "@/lib/ethiopianBanks";
import type { CompanySettings, NotificationSettings, Bank, Supplier, Buyer, Certification } from "@shared/schema";

const OTHER_BANK = "__other__";

const TABS = [
  { id: "company", label: "Company", icon: Building2 },
  { id: "banks", label: "Banks", icon: BanknoteIcon },
  { id: "suppliers", label: "Suppliers", icon: Users },
  { id: "buyers", label: "Buyers", icon: UserCheck },
  { id: "certs", label: "Certifications", icon: Award },
  { id: "notifications", label: "Notifications", icon: Bell },
];

export default function Settings() {
  const { toast } = useToast();
  const [tab, setTab] = useState("company");

  // Company
  const { data: company } = useQuery<CompanySettings>({ queryKey: ["/api/settings/company"] });
  const [companyForm, setCompanyForm] = useState<Partial<CompanySettings>>({});
  const companyMutation = useMutation({
    mutationFn: (body: any) => apiRequest("PATCH", "/api/settings/company", body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/settings/company"] }); toast({ title: "Company settings saved" }); },
  });

  // Notifications
  const { data: notifs } = useQuery<NotificationSettings>({ queryKey: ["/api/settings/notifications"] });
  const notifMutation = useMutation({
    mutationFn: (body: any) => apiRequest("PATCH", "/api/settings/notifications", body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/settings/notifications"] }); toast({ title: "Notification preferences saved" }); },
  });

  // Banks
  const { data: banks = [] } = useQuery<Bank[]>({ queryKey: ["/api/settings/banks"] });
  const [bankModal, setBankModal] = useState(false);
  const [bankForm, setBankForm] = useState({ bankName: "", accountNumber: "", swiftBic: "", currency: "ETB / USD" });
  const [bankSelect, setBankSelect] = useState<string>("");
  const handleBankSelect = (value: string) => {
    setBankSelect(value);
    if (value === OTHER_BANK) {
      setBankForm(p => ({ ...p, bankName: "", swiftBic: "" }));
    } else {
      setBankForm(p => ({ ...p, bankName: value, swiftBic: swiftForBank(value) }));
    }
  };
  const addBankMutation = useMutation({
    mutationFn: (body: any) => apiRequest("POST", "/api/settings/banks", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/banks"] });
      setBankModal(false);
      setBankSelect("");
      setBankForm({ bankName: "", accountNumber: "", swiftBic: "", currency: "ETB / USD" });
      toast({ title: "Bank added" });
    },
  });
  const deleteBankMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/settings/banks/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/settings/banks"] }); toast({ title: "Bank removed" }); },
  });

  // Suppliers
  const { data: suppliers = [] } = useQuery<Supplier[]>({ queryKey: ["/api/settings/suppliers"] });
  const [supplierModal, setSupplierModal] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [supplierForm, setSupplierForm] = useState<{ name: string; address: string; country: string; email: string; phone: string; products: string[] }>({ name: "", address: "", country: "", email: "", phone: "", products: [] });
  const [productInput, setProductInput] = useState("");
  function resetSupplierForm() {
    setSupplierForm({ name: "", address: "", country: "", email: "", phone: "", products: [] });
    setProductInput("");
    setEditingSupplierId(null);
  }
  function openAddSupplier() { resetSupplierForm(); setSupplierModal(true); }
  function openEditSupplier(s: Supplier) {
    setEditingSupplierId(s.id);
    setSupplierForm({
      name: s.name,
      address: s.address ?? "",
      country: s.country ?? "",
      email: s.email ?? "",
      phone: s.phone ?? "",
      products: s.products ?? [],
    });
    setProductInput("");
    setSupplierModal(true);
  }
  function addProduct() {
    const v = productInput.trim();
    if (!v) return;
    if (supplierForm.products.includes(v)) { setProductInput(""); return; }
    setSupplierForm(p => ({ ...p, products: [...p.products, v] }));
    setProductInput("");
  }
  function removeProduct(name: string) {
    setSupplierForm(p => ({ ...p, products: p.products.filter(x => x !== name) }));
  }
  const addSupplierMutation = useMutation({
    mutationFn: (body: any) => apiRequest("POST", "/api/settings/suppliers", body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/settings/suppliers"] }); setSupplierModal(false); resetSupplierForm(); toast({ title: "Supplier added" }); },
  });
  const updateSupplierMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => apiRequest("PATCH", `/api/settings/suppliers/${id}`, body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/settings/suppliers"] }); setSupplierModal(false); resetSupplierForm(); toast({ title: "Supplier updated" }); },
  });
  function submitSupplier() {
    if (!supplierForm.name.trim()) {
      toast({ title: "Supplier name is required", variant: "destructive" });
      return;
    }
    if (editingSupplierId) updateSupplierMutation.mutate({ id: editingSupplierId, body: supplierForm });
    else addSupplierMutation.mutate(supplierForm);
  }
  const deleteSupplierMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/settings/suppliers/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/settings/suppliers"] }); toast({ title: "Supplier removed" }); },
  });

  // Buyers (foreign buyers for export)
  const { data: buyers = [] } = useQuery<Buyer[]>({ queryKey: ["/api/settings/buyers"] });
  const [buyerModal, setBuyerModal] = useState(false);
  const [editingBuyerId, setEditingBuyerId] = useState<string | null>(null);
  const [buyerForm, setBuyerForm] = useState<{ name: string; country: string; email: string; phone: string; address: string; products: string[] }>({ name: "", country: "", email: "", phone: "", address: "", products: [] });
  const [buyerProductInput, setBuyerProductInput] = useState("");
  function resetBuyerForm() {
    setBuyerForm({ name: "", country: "", email: "", phone: "", address: "", products: [] });
    setBuyerProductInput("");
    setEditingBuyerId(null);
  }
  function openAddBuyer() { resetBuyerForm(); setBuyerModal(true); }
  function openEditBuyer(b: Buyer) {
    setEditingBuyerId(b.id);
    setBuyerForm({
      name: b.name,
      country: b.country ?? "",
      email: b.email ?? "",
      phone: b.phone ?? "",
      address: b.address ?? "",
      products: b.products ?? [],
    });
    setBuyerProductInput("");
    setBuyerModal(true);
  }
  function addBuyerProduct() {
    const v = buyerProductInput.trim();
    if (!v) return;
    if (buyerForm.products.includes(v)) { setBuyerProductInput(""); return; }
    setBuyerForm(p => ({ ...p, products: [...p.products, v] }));
    setBuyerProductInput("");
  }
  function removeBuyerProduct(name: string) {
    setBuyerForm(p => ({ ...p, products: p.products.filter(x => x !== name) }));
  }
  const addBuyerMutation = useMutation({
    mutationFn: (body: any) => apiRequest("POST", "/api/settings/buyers", body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/settings/buyers"] }); setBuyerModal(false); resetBuyerForm(); toast({ title: "Buyer added" }); },
  });
  const updateBuyerMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => apiRequest("PATCH", `/api/settings/buyers/${id}`, body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/settings/buyers"] }); setBuyerModal(false); resetBuyerForm(); toast({ title: "Buyer updated" }); },
  });
  function submitBuyer() {
    if (!buyerForm.name.trim()) {
      toast({ title: "Buyer name is required", variant: "destructive" });
      return;
    }
    if (editingBuyerId) updateBuyerMutation.mutate({ id: editingBuyerId, body: buyerForm });
    else addBuyerMutation.mutate(buyerForm);
  }
  const deleteBuyerMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/settings/buyers/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/settings/buyers"] }); toast({ title: "Buyer removed" }); },
  });

  // Certifications
  const { data: certs = [] } = useQuery<Certification[]>({ queryKey: ["/api/settings/certifications"] });
  const [certModal, setCertModal] = useState(false);
  const [certForm, setCertForm] = useState({ certType: "", issuingBody: "", category: "Quality", validity: "12 Months" });
  const addCertMutation = useMutation({
    mutationFn: (body: any) => apiRequest("POST", "/api/settings/certifications", body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/settings/certifications"] }); setCertModal(false); toast({ title: "Certification added" }); },
  });
  const deleteCertMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/settings/certifications/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/settings/certifications"] }); toast({ title: "Certification removed" }); },
  });

  function companyField(k: string, v: string) { setCompanyForm(p => ({ ...p, [k]: v })); }
  const mergedCompany = { ...company, ...companyForm };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your company profile, bank accounts, and application preferences</p>
      </div>

      {/* Tab Bar */}
      <div className="flex flex-wrap gap-1 border-b pb-2">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover-elevate"}`}
            data-testid={`tab-${t.id}`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Company Tab */}
      {tab === "company" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Company Profile</CardTitle>
            <p className="text-xs text-muted-foreground">Update your company information for documents and LC applications.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Company Name</Label>
                <Input value={mergedCompany?.companyName ?? ""} onChange={e => companyField("companyName", e.target.value)} data-testid="input-company-name" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">TIN Number</Label>
                <Input value={mergedCompany?.tinNumber ?? ""} onChange={e => companyField("tinNumber", e.target.value)} data-testid="input-tin" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">VAT Number</Label>
                <Input value={mergedCompany?.vatNumber ?? ""} onChange={e => companyField("vatNumber", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Primary Email</Label>
                <Input type="email" value={mergedCompany?.primaryEmail ?? ""} onChange={e => companyField("primaryEmail", e.target.value)} data-testid="input-company-email" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Phone Number</Label>
                <Input value={mergedCompany?.phoneNumber ?? ""} onChange={e => companyField("phoneNumber", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Website</Label>
                <Input value={mergedCompany?.website ?? ""} onChange={e => companyField("website", e.target.value)} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Registered Address</Label>
                <Textarea value={mergedCompany?.registeredAddress ?? ""} onChange={e => companyField("registeredAddress", e.target.value)} rows={2} data-testid="input-company-address" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setCompanyForm({})} data-testid="button-reset-company">Reset</Button>
              <Button size="sm" onClick={() => companyMutation.mutate(companyForm)} disabled={companyMutation.isPending} data-testid="button-save-company">
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Banks Tab */}
      {tab === "banks" && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-sm font-semibold">Bank Accounts</CardTitle>
                <p className="text-xs text-muted-foreground">Manage your corporate bank accounts for import/export finance.</p>
              </div>
              <Button size="sm" onClick={() => setBankModal(true)} data-testid="button-add-bank">
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Bank
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b">
                  <tr>
                    <th className="text-left py-2 pr-4 font-semibold text-muted-foreground">Bank Name</th>
                    <th className="text-left py-2 pr-4 font-semibold text-muted-foreground">Account Number</th>
                    <th className="text-left py-2 pr-4 font-semibold text-muted-foreground">SWIFT/BIC</th>
                    <th className="text-left py-2 pr-4 font-semibold text-muted-foreground">Currency</th>
                    <th className="text-right py-2 font-semibold text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {banks.map((bank, i) => (
                    <tr key={bank.id} className="border-b last:border-0" data-testid={`row-bank-${i}`}>
                      <td className="py-2.5 pr-4 font-medium">{bank.bankName}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{bank.accountNumber}</td>
                      <td className="py-2.5 pr-4"><Badge variant="secondary">{bank.swiftBic}</Badge></td>
                      <td className="py-2.5 pr-4">{bank.currency}</td>
                      <td className="py-2.5 text-right">
                        <Button size="icon" variant="ghost" onClick={() => deleteBankMutation.mutate(bank.id)} data-testid={`button-delete-bank-${i}`}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {banks.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No banks added</td></tr>}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suppliers Tab */}
      {tab === "suppliers" && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-sm font-semibold">Suppliers</CardTitle>
                <p className="text-xs text-muted-foreground">Manage your international suppliers.</p>
              </div>
              <Button size="sm" onClick={openAddSupplier} data-testid="button-add-supplier">
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Supplier
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b">
                  <tr>
                    <th className="text-left py-2 pr-4 font-semibold text-muted-foreground">Name</th>
                    <th className="text-left py-2 pr-4 font-semibold text-muted-foreground">Country</th>
                    <th className="text-left py-2 pr-4 font-semibold text-muted-foreground">Products</th>
                    <th className="text-left py-2 pr-4 font-semibold text-muted-foreground">Email</th>
                    <th className="text-left py-2 pr-4 font-semibold text-muted-foreground">Phone</th>
                    <th className="text-right py-2 font-semibold text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((s, i) => (
                    <tr key={s.id} className="border-b last:border-0" data-testid={`row-supplier-${i}`}>
                      <td className="py-2.5 pr-4 font-medium align-top">{s.name}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground align-top">{s.country ?? "—"}</td>
                      <td className="py-2.5 pr-4 align-top">
                        {s.products && s.products.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[260px]">
                            {s.products.map(p => <Badge key={p} variant="outline" className="text-[0.65rem]">{p}</Badge>)}
                          </div>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-2.5 pr-4 text-muted-foreground align-top">{s.email ?? "—"}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground align-top">{s.phone ?? "—"}</td>
                      <td className="py-2.5 text-right align-top">
                        <Button size="icon" variant="ghost" onClick={() => openEditSupplier(s)} data-testid={`button-edit-supplier-${i}`}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => deleteSupplierMutation.mutate(s.id)} data-testid={`button-delete-supplier-${i}`}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {suppliers.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No suppliers added</td></tr>}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Buyers Tab */}
      {tab === "buyers" && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-sm font-semibold">Foreign Buyers</CardTitle>
                <p className="text-xs text-muted-foreground">Manage your international buyers. Their products will auto-appear when selected on a new CAD.</p>
              </div>
              <Button size="sm" onClick={openAddBuyer} data-testid="button-add-buyer">
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Buyer
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b">
                  <tr>
                    <th className="text-left py-2 pr-4 font-semibold text-muted-foreground">Name</th>
                    <th className="text-left py-2 pr-4 font-semibold text-muted-foreground">Country</th>
                    <th className="text-left py-2 pr-4 font-semibold text-muted-foreground">Products</th>
                    <th className="text-left py-2 pr-4 font-semibold text-muted-foreground">Email</th>
                    <th className="text-left py-2 pr-4 font-semibold text-muted-foreground">Phone</th>
                    <th className="text-right py-2 font-semibold text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {buyers.map((b, i) => (
                    <tr key={b.id} className="border-b last:border-0" data-testid={`row-buyer-${i}`}>
                      <td className="py-2.5 pr-4 font-medium align-top">{b.name}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground align-top">{b.country ?? "—"}</td>
                      <td className="py-2.5 pr-4 align-top">
                        {b.products && b.products.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[260px]">
                            {b.products.map(p => <Badge key={p} variant="outline" className="text-[0.65rem]">{p}</Badge>)}
                          </div>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-2.5 pr-4 text-muted-foreground align-top">{b.email ?? "—"}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground align-top">{b.phone ?? "—"}</td>
                      <td className="py-2.5 text-right align-top">
                        <Button size="icon" variant="ghost" onClick={() => openEditBuyer(b)} data-testid={`button-edit-buyer-${i}`}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => deleteBuyerMutation.mutate(b.id)} data-testid={`button-delete-buyer-${i}`}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {buyers.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No buyers added</td></tr>}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Certs Tab */}
      {tab === "certs" && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-sm font-semibold">Certification Types</CardTitle>
                <p className="text-xs text-muted-foreground">Manage standard certifications required for export/import quality control.</p>
              </div>
              <Button size="sm" onClick={() => setCertModal(true)} data-testid="button-add-cert">
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Certification
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b">
                  <tr>
                    <th className="text-left py-2 pr-4 font-semibold text-muted-foreground">Cert Type</th>
                    <th className="text-left py-2 pr-4 font-semibold text-muted-foreground">Issuing Body</th>
                    <th className="text-left py-2 pr-4 font-semibold text-muted-foreground">Category</th>
                    <th className="text-left py-2 pr-4 font-semibold text-muted-foreground">Validity</th>
                    <th className="text-right py-2 font-semibold text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {certs.map((c, i) => (
                    <tr key={c.id} className="border-b last:border-0" data-testid={`row-cert-${i}`}>
                      <td className="py-2.5 pr-4 font-medium">{c.certType}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{c.issuingBody}</td>
                      <td className="py-2.5 pr-4"><Badge variant="secondary">{c.category}</Badge></td>
                      <td className="py-2.5 pr-4">{c.validity}</td>
                      <td className="py-2.5 text-right">
                        <Button size="icon" variant="ghost" onClick={() => deleteCertMutation.mutate(c.id)} data-testid={`button-delete-cert-${i}`}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {certs.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No certifications added</td></tr>}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notifications Tab */}
      {tab === "notifications" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Notification Settings</CardTitle>
            <p className="text-xs text-muted-foreground">Configure how and when you receive alerts from the platform.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: "shipmentUpdates", label: "Shipment Updates", desc: "Receive alerts when shipment status changes." },
              { key: "lcExpiryAlerts", label: "LC Expiry Alerts", desc: "Get notified 15 days before an LC or CAD expires." },
              { key: "paymentNotifications", label: "Payment Notifications", desc: "Alerts for bank settlement and payment receipt." },
              { key: "marketRateAlerts", label: "Market Rate Alerts", desc: "Weekly summary of exchange rate fluctuations." },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between gap-4" data-testid={`row-notif-${item.key}`}>
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch
                  checked={notifs ? notifs[item.key as keyof NotificationSettings] === "true" : false}
                  onCheckedChange={v => notifMutation.mutate({ [item.key]: String(v) })}
                  data-testid={`switch-${item.key}`}
                />
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={() => notifMutation.mutate({ shipmentUpdates: "true", lcExpiryAlerts: "true", paymentNotifications: "true", marketRateAlerts: "false" })} data-testid="button-reset-notifications">
                Reset to Default
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bank Modal */}
      <Dialog open={bankModal} onOpenChange={(o) => { setBankModal(o); if (!o) { setBankSelect(""); setBankForm({ bankName: "", accountNumber: "", swiftBic: "", currency: "ETB / USD" }); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Bank Account</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Bank Name</Label>
              <Select value={bankSelect} onValueChange={handleBankSelect}>
                <SelectTrigger data-testid="select-bank-name"><SelectValue placeholder="Select a bank" /></SelectTrigger>
                <SelectContent>
                  {ETHIOPIAN_BANKS.map(b => (
                    <SelectItem key={b.name} value={b.name} data-testid={`option-bank-${b.name.toLowerCase().replace(/\s+/g, "-")}`}>{b.name}</SelectItem>
                  ))}
                  <SelectItem value={OTHER_BANK}>Other (enter manually)</SelectItem>
                </SelectContent>
              </Select>
              {bankSelect === OTHER_BANK && (
                <Input
                  className="mt-2"
                  placeholder="Enter bank name"
                  value={bankForm.bankName}
                  onChange={e => setBankForm(p => ({ ...p, bankName: e.target.value }))}
                  data-testid="input-bank-name-custom"
                />
              )}
            </div>
            <div className="space-y-1"><Label className="text-xs">Account Number</Label><Input value={bankForm.accountNumber} onChange={e => setBankForm(p => ({ ...p, accountNumber: e.target.value }))} data-testid="input-bank-account" /></div>
            <div className="space-y-1">
              <Label className="text-xs">SWIFT/BIC {bankSelect && bankSelect !== OTHER_BANK && <span className="text-[0.65rem] text-muted-foreground ml-1">(auto-filled, editable)</span>}</Label>
              <Input value={bankForm.swiftBic} onChange={e => setBankForm(p => ({ ...p, swiftBic: e.target.value }))} data-testid="input-bank-swift" />
            </div>
            <div className="space-y-1"><Label className="text-xs">Currency</Label><Input value={bankForm.currency} onChange={e => setBankForm(p => ({ ...p, currency: e.target.value }))} placeholder="ETB / USD" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBankModal(false)}>Cancel</Button>
            <Button onClick={() => addBankMutation.mutate(bankForm)} disabled={addBankMutation.isPending} data-testid="button-submit-bank">Add Bank</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Supplier Modal */}
      <Dialog open={supplierModal} onOpenChange={(o) => { setSupplierModal(o); if (!o) resetSupplierForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingSupplierId ? "Edit Supplier" : "Add Supplier"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1"><Label className="text-xs">Name</Label><Input value={supplierForm.name} onChange={e => setSupplierForm(p => ({ ...p, name: e.target.value }))} data-testid="input-supplier-name-settings" /></div>
            <div className="space-y-1"><Label className="text-xs">Country</Label><Input value={supplierForm.country} onChange={e => setSupplierForm(p => ({ ...p, country: e.target.value }))} /></div>
            <div className="space-y-1"><Label className="text-xs">Email</Label><Input type="email" value={supplierForm.email} onChange={e => setSupplierForm(p => ({ ...p, email: e.target.value }))} /></div>
            <div className="space-y-1"><Label className="text-xs">Phone</Label><Input value={supplierForm.phone} onChange={e => setSupplierForm(p => ({ ...p, phone: e.target.value }))} /></div>
            <div className="space-y-1"><Label className="text-xs">Address</Label><Input value={supplierForm.address} onChange={e => setSupplierForm(p => ({ ...p, address: e.target.value }))} /></div>
            <div className="space-y-1.5">
              <Label className="text-xs">Products Supplied</Label>
              <p className="text-[0.65rem] text-muted-foreground">These products will appear automatically when this supplier is selected on an LC or Purchase Order.</p>
              <div className="flex gap-2">
                <Input
                  value={productInput}
                  onChange={e => setProductInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addProduct(); } }}
                  placeholder="e.g. Industrial Machinery"
                  data-testid="input-supplier-product"
                />
                <Button type="button" variant="outline" onClick={addProduct} data-testid="button-add-product">
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              {supplierForm.products.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1" data-testid="list-supplier-products">
                  {supplierForm.products.map(p => (
                    <Badge key={p} variant="secondary" className="gap-1 pr-1">
                      {p}
                      <button
                        type="button"
                        onClick={() => removeProduct(p)}
                        className="rounded-sm hover-elevate p-0.5"
                        data-testid={`button-remove-product-${p.toLowerCase().replace(/\s+/g, "-")}`}
                        aria-label={`Remove ${p}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSupplierModal(false); resetSupplierForm(); }}>Cancel</Button>
            <Button
              onClick={submitSupplier}
              disabled={addSupplierMutation.isPending || updateSupplierMutation.isPending}
              data-testid="button-submit-supplier"
            >
              {editingSupplierId ? "Save Changes" : "Add Supplier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Buyer Modal */}
      <Dialog open={buyerModal} onOpenChange={(o) => { setBuyerModal(o); if (!o) resetBuyerForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingBuyerId ? "Edit Buyer" : "Add Foreign Buyer"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1"><Label className="text-xs">Name</Label><Input value={buyerForm.name} onChange={e => setBuyerForm(p => ({ ...p, name: e.target.value }))} data-testid="input-buyer-name-settings" /></div>
            <div className="space-y-1"><Label className="text-xs">Country</Label><Input value={buyerForm.country} onChange={e => setBuyerForm(p => ({ ...p, country: e.target.value }))} data-testid="input-buyer-country-settings" /></div>
            <div className="space-y-1"><Label className="text-xs">Email</Label><Input type="email" value={buyerForm.email} onChange={e => setBuyerForm(p => ({ ...p, email: e.target.value }))} data-testid="input-buyer-email-settings" /></div>
            <div className="space-y-1"><Label className="text-xs">Phone</Label><Input value={buyerForm.phone} onChange={e => setBuyerForm(p => ({ ...p, phone: e.target.value }))} data-testid="input-buyer-phone-settings" /></div>
            <div className="space-y-1"><Label className="text-xs">Address</Label><Input value={buyerForm.address} onChange={e => setBuyerForm(p => ({ ...p, address: e.target.value }))} data-testid="input-buyer-address-settings" /></div>
            <div className="space-y-1.5">
              <Label className="text-xs">Buyer's Products</Label>
              <p className="text-[0.65rem] text-muted-foreground">These products will appear automatically when this buyer is selected on a new CAD.</p>
              <div className="flex gap-2">
                <Input
                  value={buyerProductInput}
                  onChange={e => setBuyerProductInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addBuyerProduct(); } }}
                  placeholder="e.g. Yirgacheffe Coffee Grade 1"
                  data-testid="input-buyer-product"
                />
                <Button type="button" variant="outline" onClick={addBuyerProduct} data-testid="button-add-buyer-product">
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              {buyerForm.products.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1" data-testid="list-buyer-products">
                  {buyerForm.products.map(p => (
                    <Badge key={p} variant="secondary" className="gap-1 pr-1">
                      {p}
                      <button
                        type="button"
                        onClick={() => removeBuyerProduct(p)}
                        className="rounded-sm hover-elevate p-0.5"
                        data-testid={`button-remove-buyer-product-${p.toLowerCase().replace(/\s+/g, "-")}`}
                        aria-label={`Remove ${p}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setBuyerModal(false); resetBuyerForm(); }}>Cancel</Button>
            <Button
              onClick={submitBuyer}
              disabled={addBuyerMutation.isPending || updateBuyerMutation.isPending}
              data-testid="button-submit-buyer"
            >
              {editingBuyerId ? "Save Changes" : "Add Buyer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cert Modal */}
      <Dialog open={certModal} onOpenChange={setCertModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Certification</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1"><Label className="text-xs">Cert Type</Label><Input value={certForm.certType} onChange={e => setCertForm(p => ({ ...p, certType: e.target.value }))} data-testid="input-cert-type" /></div>
            <div className="space-y-1"><Label className="text-xs">Issuing Body</Label><Input value={certForm.issuingBody} onChange={e => setCertForm(p => ({ ...p, issuingBody: e.target.value }))} /></div>
            <div className="space-y-1"><Label className="text-xs">Category</Label><Input value={certForm.category} onChange={e => setCertForm(p => ({ ...p, category: e.target.value }))} placeholder="Quality / Social / Environment" /></div>
            <div className="space-y-1"><Label className="text-xs">Validity</Label><Input value={certForm.validity} onChange={e => setCertForm(p => ({ ...p, validity: e.target.value }))} placeholder="12 Months" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCertModal(false)}>Cancel</Button>
            <Button onClick={() => addCertMutation.mutate(certForm)} disabled={addCertMutation.isPending} data-testid="button-submit-cert">Add Certification</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
