import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const CURRENCIES = ["USD", "JPY", "EUR", "AED", "DJF"];

type ShipType = "full" | "partial";

interface State {
  bank_name: string;
  lc_number: string;
  total_units: string;
  currency_type: string;
  fcy_value: string;
  opening_rate: string;
  opening_margin_pct: string;
  swift_usd: string;
  fs_rate: string;
  fs_other_usd: string;
  ff_fcy: string;
  ff_rate: string;
  p1_units: string;
  p1_rate: string;
  p1_other_usd: string;
  total_freight_fcy: string;
  p1_freight_rate: string;
  p2_rate: string;
  p2_other_usd: string;
  p2_freight_rate: string;
}

const initial: State = {
  bank_name: "", lc_number: "", total_units: "", currency_type: "USD",
  fcy_value: "", opening_rate: "", opening_margin_pct: "30", swift_usd: "",
  fs_rate: "", fs_other_usd: "",
  ff_fcy: "", ff_rate: "",
  p1_units: "", p1_rate: "", p1_other_usd: "",
  total_freight_fcy: "", p1_freight_rate: "",
  p2_rate: "", p2_other_usd: "", p2_freight_rate: "",
};

const num = (s: string) => parseFloat(s) || 0;

const fmtEtb = (n: number) => (!n && n !== 0)
  ? "—"
  : "ETB " + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtUSD = (n: number) => n
  ? "$ " + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  : "—";

interface RowProps {
  label: string;
  hint?: string;
  badge?: string;
  variant?: "input" | "calc" | "total" | "grand";
  paid?: boolean;
  onTogglePaid?: () => void;
  middle?: React.ReactNode;
  value: string;
}

function Row({ label, hint, badge, variant = "calc", paid, onTogglePaid, middle, value }: RowProps) {
  const borderColor =
    variant === "input" ? "border-l-[3px] border-l-amber-600"
      : variant === "calc" ? "border-l-[3px] border-l-amber-700/50 bg-amber-50/30 dark:bg-amber-950/10"
        : variant === "total" ? (paid
          ? "border-l-[3px] border-l-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"
          : "border-l-[3px] border-l-red-600 bg-red-50 dark:bg-red-950/30")
        : "border-l-[4px] border-l-primary bg-primary/10";

  return (
    <div
      className={cn(
        "grid grid-cols-[1fr_auto_auto] items-center gap-4 px-4 py-2.5 border-b border-border/40 last:border-b-0",
        borderColor,
        (variant === "total" || variant === "grand") && "py-3.5",
      )}
    >
      <div className="min-w-0">
        <div className={cn(
          "text-[0.7rem] uppercase tracking-[0.06em]",
          variant === "total" || variant === "grand" ? "text-foreground font-medium text-[0.74rem]" : "text-muted-foreground"
        )}>
          {label}
          {badge && <span className="ml-2 text-[0.58rem] bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200 px-1.5 py-0.5 rounded tracking-[0.08em]">{badge}</span>}
          {hint && <span className="ml-2 text-[0.62rem] text-muted-foreground/70 normal-case tracking-normal">{hint}</span>}
        </div>
        {variant === "total" && onTogglePaid && (
          <label className="mt-2 flex items-center gap-2 text-[0.65rem] text-muted-foreground uppercase tracking-[0.06em] cursor-pointer w-fit">
            <Switch checked={!!paid} onCheckedChange={onTogglePaid} />
            Mark as Paid
          </label>
        )}
      </div>
      <div className="min-w-[120px] text-right text-xs text-muted-foreground tabular-nums">
        {middle}
      </div>
      <div className={cn(
        "min-w-[180px] text-right font-semibold tabular-nums text-sm",
        variant === "total" && (paid ? "text-emerald-700 dark:text-emerald-400 text-base" : "text-red-700 dark:text-red-400 text-base"),
        variant === "grand" && "text-primary text-lg",
      )}>
        {value}
      </div>
    </div>
  );
}

function Section({ title, badge, children, hidden }: { title: string; badge?: string; children: React.ReactNode; hidden?: boolean }) {
  if (hidden) return null;
  return (
    <div className="rounded-md border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b border-border">
        <h3 className="font-display text-[1.05rem] font-semibold text-primary tracking-tight">{title}</h3>
        {badge && <span className="text-[0.6rem] bg-primary/15 text-primary px-2 py-0.5 rounded tracking-[0.1em] uppercase font-medium">{badge}</span>}
      </div>
      <div>{children}</div>
    </div>
  );
}

interface Props {
  /** Override exchange rate / FCY value etc from parent form, optional */
  initialFcyValue?: string;
  initialOpeningRate?: string;
  initialTotalUnits?: string;
  initialBank?: string;
  initialLcNumber?: string;
  /** If set, locks the calculator to this scenario and disables the other tab. */
  lockedShipType?: ShipType;
}

export function LCCostCalculator(props: Props) {
  const [shipType, setShipType] = useState<ShipType>(props.lockedShipType ?? "full");
  useEffect(() => {
    if (props.lockedShipType) setShipType(props.lockedShipType);
  }, [props.lockedShipType]);
  const [freightOn, setFreightOn] = useState(false);
  const [paid, setPaid] = useState<Record<string, boolean>>({});
  const [s, setS] = useState<State>({
    ...initial,
    fcy_value: props.initialFcyValue ?? initial.fcy_value,
    opening_rate: props.initialOpeningRate ?? initial.opening_rate,
    total_units: props.initialTotalUnits ?? initial.total_units,
    bank_name: props.initialBank ?? initial.bank_name,
    lc_number: props.initialLcNumber ?? initial.lc_number,
  });

  const set = (k: keyof State, v: string) => setS(p => ({ ...p, [k]: v }));
  const tp = (k: string) => setPaid(p => ({ ...p, [k]: !p[k] }));

  const c = useMemo(() => {
    const fcy_value = num(s.fcy_value);
    const opening_rate = num(s.opening_rate);
    const opening_margin_pct = num(s.opening_margin_pct) / 100;
    const swift_usd = num(s.swift_usd);

    // LC OPENING
    const fcy_etb = fcy_value * opening_rate;
    const opening_margin_etb = fcy_etb * opening_margin_pct;
    const bsc_open = fcy_etb * 0.04;
    const vat_bsc_open = bsc_open * 0.15;
    const swift_etb = swift_usd * opening_rate;
    const vat_swift = swift_etb * 0.15;
    const total_opening = opening_margin_etb + bsc_open + vat_bsc_open + swift_etb + vat_swift;

    let grand = total_opening;

    // FULL
    const fs_rate = num(s.fs_rate);
    const fs_other_usd = num(s.fs_other_usd);
    const fs_fcy_etb = fcy_value * fs_rate;
    const fs_margin_held = opening_margin_etb;
    const fs_settle_pct = 1 - opening_margin_pct;
    const fs_settle_etb = fs_fcy_etb - fs_margin_held;
    const fs_nbe = fs_fcy_etb * 0.025;
    const fs_other_etb = fs_other_usd * fs_rate;
    const total_fs_settle = fs_settle_etb + fs_nbe + fs_other_etb;
    const total_lc_payable = total_opening + total_fs_settle;

    const ff_fcy = num(s.ff_fcy);
    const ff_rate = num(s.ff_rate);
    const ff_etb = ff_fcy * ff_rate;
    const ff_bsc = ff_etb * 0.04;
    const ff_vat_bsc = ff_bsc * 0.15;
    const ff_nbe = ff_etb * 0.025;
    const total_ff = ff_etb + ff_bsc + ff_vat_bsc + ff_nbe;

    if (shipType === "full") {
      grand += total_fs_settle;
      if (freightOn) grand += total_ff;
    }

    // PARTIAL
    const total_units = num(s.total_units);
    const p1_units = num(s.p1_units);
    const p1_rate = num(s.p1_rate);
    const p1_other_usd = num(s.p1_other_usd);
    const total_freight_fcy = num(s.total_freight_fcy);
    const p1_freight_rate = num(s.p1_freight_rate);
    const p2_rate = num(s.p2_rate);
    const p2_other_usd = num(s.p2_other_usd);
    const p2_freight_rate = num(s.p2_freight_rate);

    const ratio1 = total_units ? p1_units / total_units : 0;

    const p1_fcy = fcy_value * ratio1;
    const p1_fcy_etb = p1_fcy * p1_rate;
    const p1_margin_held = opening_margin_etb * ratio1;
    const p1_settle_pct = 1 - opening_margin_pct;
    const p1_settle_etb = p1_fcy_etb - p1_margin_held;
    const p1_nbe = p1_fcy_etb * 0.025;
    const p1_other_etb = p1_other_usd * p1_rate;
    const total_p1_settle = p1_settle_etb + p1_nbe + p1_other_etb;

    const p1_ff_fcy = total_freight_fcy * ratio1;
    const p1_ff_etb = p1_ff_fcy * p1_freight_rate;
    const p1_ff_bsc = p1_ff_etb * 0.04;
    const p1_ff_vat = p1_ff_bsc * 0.15;
    const p1_ff_nbe = p1_ff_etb * 0.025;
    const total_p1_freight = p1_ff_etb + p1_ff_bsc + p1_ff_vat + p1_ff_nbe;

    const p2_units = total_units - p1_units;
    const p2_fcy = fcy_value - p1_fcy;
    const p2_fcy_etb = p2_fcy * p2_rate;
    const p2_margin_held = opening_margin_etb - p1_margin_held;
    const p2_settle_pct = 1 - opening_margin_pct;
    const p2_settle_etb = p2_fcy_etb - p2_margin_held;
    const p2_nbe = p2_fcy_etb * 0.025;
    const p2_other_etb = p2_other_usd * p2_rate;
    const total_p2_settle = p2_settle_etb + p2_nbe + p2_other_etb;

    const p2_ff_fcy = total_freight_fcy - p1_ff_fcy;
    const p2_ff_etb = p2_ff_fcy * p2_freight_rate;
    const p2_ff_bsc = p2_ff_etb * 0.04;
    const p2_ff_vat = p2_ff_bsc * 0.15;
    const p2_ff_nbe = p2_ff_etb * 0.025;
    const total_p2_freight = p2_ff_etb + p2_ff_bsc + p2_ff_vat + p2_ff_nbe;

    if (shipType === "partial") {
      grand += total_p1_settle + total_p1_freight + total_p2_settle + total_p2_freight;
    }

    return {
      fcy_value, fcy_etb, opening_margin_pct, opening_margin_etb, bsc_open, vat_bsc_open,
      swift_usd, swift_etb, vat_swift, total_opening,
      fs_fcy_etb, fs_margin_held, fs_settle_pct, fs_settle_etb, fs_nbe, fs_other_usd, fs_other_etb,
      total_fs_settle, total_lc_payable,
      ff_fcy, ff_etb, ff_bsc, ff_vat_bsc, ff_nbe, total_ff,
      p1_fcy, p1_fcy_etb, p1_margin_held, p1_settle_pct, p1_settle_etb, p1_nbe, p1_other_etb, total_p1_settle,
      p1_ff_fcy, p1_ff_etb, p1_ff_bsc, p1_ff_vat, p1_ff_nbe, total_p1_freight,
      p2_units, p2_fcy, p2_fcy_etb, p2_margin_held, p2_settle_pct, p2_settle_etb, p2_nbe, p2_other_etb, total_p2_settle,
      p2_ff_fcy, p2_ff_etb, p2_ff_bsc, p2_ff_vat, p2_ff_nbe, total_p2_freight,
      grand, p1_other_usd, p2_other_usd, total_freight_fcy,
    };
  }, [s, shipType, freightOn]);

  const inputClass = "h-8 text-xs tabular-nums";

  return (
    <div className="space-y-4">
      {/* Type selector */}
      <div className="flex gap-2 p-1.5 rounded-md border border-border bg-muted/40">
        {([
          ["full", "Case 1 — Full Shipment"],
          ["partial", "Case 2 — Partial Shipment"],
        ] as const).map(([k, l]) => {
          const disabled = !!props.lockedShipType && props.lockedShipType !== k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => { if (!disabled) setShipType(k); }}
              disabled={disabled}
              data-testid={`button-shiptype-${k}`}
              className={cn(
                "flex-1 px-3 py-2 rounded text-[0.72rem] uppercase tracking-[0.08em] transition-colors",
                shipType === k
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover-elevate",
                disabled && "opacity-40 cursor-not-allowed hover:bg-transparent"
              )}
            >
              {l}
            </button>
          );
        })}
      </div>

      {/* Header */}
      <Section title="Document Header" badge="Required">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border/40">
          <div className="bg-card p-3">
            <label className="text-[0.62rem] uppercase tracking-[0.1em] text-muted-foreground block mb-1.5">Bank Name</label>
            <Input className={inputClass} value={s.bank_name} onChange={e => set("bank_name", e.target.value)} placeholder="e.g. Awash Bank" data-testid="input-calc-bank" />
          </div>
          <div className="bg-card p-3">
            <label className="text-[0.62rem] uppercase tracking-[0.1em] text-muted-foreground block mb-1.5">LC / Document Ref No.</label>
            <Input className={inputClass} value={s.lc_number} onChange={e => set("lc_number", e.target.value)} placeholder="e.g. AIB1000283ET" data-testid="input-calc-lcref" />
          </div>
          <div className="bg-card p-3">
            <label className="text-[0.62rem] uppercase tracking-[0.1em] text-muted-foreground block mb-1.5">Total Units (Qty)</label>
            <Input type="number" className={inputClass} value={s.total_units} onChange={e => set("total_units", e.target.value)} placeholder="0" data-testid="input-calc-total-units" />
          </div>
          <div className="bg-card p-3">
            <label className="text-[0.62rem] uppercase tracking-[0.1em] text-muted-foreground block mb-1.5">Currency Type</label>
            <Select value={s.currency_type} onValueChange={v => set("currency_type", v)}>
              <SelectTrigger className="h-8 text-xs" data-testid="select-calc-currency"><SelectValue /></SelectTrigger>
              <SelectContent>{CURRENCIES.map(cu => <SelectItem key={cu} value={cu}>{cu}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </Section>

      {/* LC OPENING */}
      <Section title="LC Opening Payable — All Units" badge="Always">
        <Row variant="input" label="FCY Value (FOB)" hint="From proforma invoice"
          middle={<div className="flex items-center gap-2 justify-end"><Input type="number" className={cn(inputClass, "w-32")} value={s.fcy_value} onChange={e => set("fcy_value", e.target.value)} placeholder="0.00" data-testid="input-calc-fcy" /><span className="text-[0.6rem] text-amber-700">{s.currency_type}</span></div>}
          value={fmtUSD(c.fcy_value)} />
        <Row variant="input" label="Opening Exchange Rate (ETB)"
          middle={<Input type="number" step="0.0001" className={cn(inputClass, "w-28 ml-auto")} value={s.opening_rate} onChange={e => set("opening_rate", e.target.value)} placeholder="0.0000" data-testid="input-calc-opening-rate" />}
          value={fmtEtb(c.fcy_etb)} />
        <Row variant="input" label="Opening Margin %"
          middle={<Input type="number" className={cn(inputClass, "w-20 ml-auto")} value={s.opening_margin_pct} onChange={e => set("opening_margin_pct", e.target.value)} placeholder="30" data-testid="input-calc-margin-pct" />}
          value={fmtEtb(c.opening_margin_etb)} />
        <Row label="Bank Service Charge" hint="Fixed 4%" middle="× 4%" value={fmtEtb(c.bsc_open)} />
        <Row label="VAT on BSC" hint="Fixed 15%" middle="× 15%" value={fmtEtb(c.vat_bsc_open)} />
        <Row variant="input" label="Swift Charge (if any)"
          middle={<div className="flex items-center gap-2 justify-end"><Input type="number" className={cn(inputClass, "w-32")} value={s.swift_usd} onChange={e => set("swift_usd", e.target.value)} placeholder="0.00" data-testid="input-calc-swift" /><span className="text-[0.6rem] text-amber-700">USD</span></div>}
          value={c.swift_usd ? fmtEtb(c.swift_etb) : "—"} />
        <Row label="VAT on Swift Charge" hint="Fixed 15%" middle="× 15%" value={c.swift_usd ? fmtEtb(c.vat_swift) : "—"} />
        <Row variant="total" label="TOTAL LC Opening Debited" paid={!!paid.opening} onTogglePaid={() => tp("opening")} value={fmtEtb(c.total_opening)} />
      </Section>

      {/* FULL SETTLEMENT */}
      <Section title="LC Settlement Payable — Full Shipment" hidden={shipType !== "full"}>
        <Row variant="input" label="Settlement Exchange Rate (ETB)"
          middle={<Input type="number" step="0.0001" className={cn(inputClass, "w-28 ml-auto")} value={s.fs_rate} onChange={e => set("fs_rate", e.target.value)} placeholder="0.0000" data-testid="input-calc-fs-rate" />}
          value={fmtEtb(c.fs_fcy_etb)} />
        <Row label="Margin Held Payable" badge="Carried" middle={(c.opening_margin_pct * 100).toFixed(1) + "%"} value={fmtEtb(c.fs_margin_held)} />
        <Row label="Settlement Amount %" middle={(c.fs_settle_pct * 100).toFixed(1) + "%"} value={fmtEtb(c.fs_settle_etb)} />
        <Row label="NBE 2.5% Rate" hint="Fixed 2.5%" middle="× 2.5%" value={fmtEtb(c.fs_nbe)} />
        <Row variant="input" label="Other Payment (USD, if any)"
          middle={<div className="flex items-center gap-2 justify-end"><Input type="number" className={cn(inputClass, "w-32")} value={s.fs_other_usd} onChange={e => set("fs_other_usd", e.target.value)} placeholder="0.00" data-testid="input-calc-fs-other" /><span className="text-[0.6rem] text-amber-700">USD</span></div>}
          value={c.fs_other_usd ? fmtEtb(c.fs_other_etb) : "—"} />
        <Row variant="total" label="TOTAL LC Settlement Debited" paid={!!paid.fs_settle} onTogglePaid={() => tp("fs_settle")} value={fmtEtb(c.total_fs_settle)} />
        <Row variant="grand" label="TOTAL ETB Amount Payable on This LC" value={fmtEtb(c.total_lc_payable)} />
      </Section>

      {/* FULL FREIGHT */}
      <Section title="Sea Freight Payable — Full Shipment" badge="Skip if Djibouti" hidden={shipType !== "full"}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 text-[0.72rem] uppercase tracking-[0.06em] text-muted-foreground">
          <Switch checked={freightOn} onCheckedChange={setFreightOn} data-testid="switch-include-freight" />
          Include Sea Freight in Calculation
        </div>
        {freightOn && (
          <>
            <Row variant="input" label="Freight FCY Value (USD)"
              middle={<div className="flex items-center gap-2 justify-end"><Input type="number" className={cn(inputClass, "w-32")} value={s.ff_fcy} onChange={e => set("ff_fcy", e.target.value)} placeholder="0.00" data-testid="input-calc-ff-fcy" /><span className="text-[0.6rem] text-amber-700">USD</span></div>}
              value={fmtUSD(c.ff_fcy)} />
            <Row variant="input" label="Freight Exchange Rate (ETB)"
              middle={<Input type="number" step="0.0001" className={cn(inputClass, "w-28 ml-auto")} value={s.ff_rate} onChange={e => set("ff_rate", e.target.value)} placeholder="0.0000" data-testid="input-calc-ff-rate" />}
              value={fmtEtb(c.ff_etb)} />
            <Row label="Bank Service Charge" hint="Fixed 4%" middle="× 4%" value={fmtEtb(c.ff_bsc)} />
            <Row label="VAT on BSC" hint="Fixed 15%" middle="× 15%" value={fmtEtb(c.ff_vat_bsc)} />
            <Row label="NBE 2.5% Rate" hint="Fixed 2.5%" middle="× 2.5%" value={fmtEtb(c.ff_nbe)} />
            <Row variant="total" label="TOTAL Freight Payable Debited" paid={!!paid.ff} onTogglePaid={() => tp("ff")} value={fmtEtb(c.total_ff)} />
          </>
        )}
      </Section>

      {/* P1 SETTLEMENT */}
      <Section title="1st Partial — LC Settlement" badge="Partial" hidden={shipType !== "partial"}>
        <Row variant="input" label="Units Shipped (1st Partial)"
          middle={<Input type="number" className={cn(inputClass, "w-28 ml-auto")} value={s.p1_units} onChange={e => set("p1_units", e.target.value)} placeholder="0" data-testid="input-calc-p1-units" />}
          value={fmtUSD(c.p1_fcy)} />
        <Row variant="input" label="1st Partial Settlement Rate (ETB)"
          middle={<Input type="number" step="0.0001" className={cn(inputClass, "w-28 ml-auto")} value={s.p1_rate} onChange={e => set("p1_rate", e.target.value)} placeholder="0.0000" data-testid="input-calc-p1-rate" />}
          value={fmtEtb(c.p1_fcy_etb)} />
        <Row label="Margin Held" badge="Proportional" middle={(c.opening_margin_pct * 100).toFixed(1) + "%"} value={fmtEtb(c.p1_margin_held)} />
        <Row label="Settlement Amount %" middle={(c.p1_settle_pct * 100).toFixed(1) + "%"} value={fmtEtb(c.p1_settle_etb)} />
        <Row label="NBE 2.5% Rate" middle="× 2.5%" value={fmtEtb(c.p1_nbe)} />
        <Row variant="input" label="Other Payment (USD, if any)"
          middle={<div className="flex items-center gap-2 justify-end"><Input type="number" className={cn(inputClass, "w-32")} value={s.p1_other_usd} onChange={e => set("p1_other_usd", e.target.value)} placeholder="0.00" data-testid="input-calc-p1-other" /><span className="text-[0.6rem] text-amber-700">USD</span></div>}
          value={c.p1_other_usd ? fmtEtb(c.p1_other_etb) : "—"} />
        <Row variant="total" label="TOTAL 1st Partial Settlement Debited" paid={!!paid.p1_settle} onTogglePaid={() => tp("p1_settle")} value={fmtEtb(c.total_p1_settle)} />
      </Section>

      {/* P1 FREIGHT */}
      <Section title="1st Partial — Sea Freight" badge="Partial" hidden={shipType !== "partial"}>
        <Row variant="input" label="Total Freight FCY (USD) — Full Shipment"
          middle={<div className="flex items-center gap-2 justify-end"><Input type="number" className={cn(inputClass, "w-32")} value={s.total_freight_fcy} onChange={e => set("total_freight_fcy", e.target.value)} placeholder="0.00" data-testid="input-calc-total-freight-fcy" /><span className="text-[0.6rem] text-amber-700">USD</span></div>}
          value={fmtUSD(c.p1_ff_fcy)} />
        <Row variant="input" label="1st Partial Freight Rate (ETB)"
          middle={<Input type="number" step="0.0001" className={cn(inputClass, "w-28 ml-auto")} value={s.p1_freight_rate} onChange={e => set("p1_freight_rate", e.target.value)} placeholder="0.0000" data-testid="input-calc-p1-freight-rate" />}
          value={fmtEtb(c.p1_ff_etb)} />
        <Row label="Bank Service Charge" hint="Fixed 4%" middle="× 4%" value={fmtEtb(c.p1_ff_bsc)} />
        <Row label="VAT on BSC" hint="Fixed 15%" middle="× 15%" value={fmtEtb(c.p1_ff_vat)} />
        <Row label="NBE 2.5% Rate" middle="× 2.5%" value={fmtEtb(c.p1_ff_nbe)} />
        <Row variant="total" label="TOTAL 1st Partial Freight Debited" paid={!!paid.p1_freight} onTogglePaid={() => tp("p1_freight")} value={fmtEtb(c.total_p1_freight)} />
      </Section>

      {/* P2 SETTLEMENT */}
      <Section title="Remaining Units — LC Settlement" badge="Partial" hidden={shipType !== "partial"}>
        <Row label="Remaining Units" badge="Auto" middle="" value={c.p2_units ? String(c.p2_units) : "—"} />
        <Row label="Remaining FCY (USD)" badge="Auto" middle="" value={fmtUSD(c.p2_fcy)} />
        <Row variant="input" label="Remaining Settlement Rate (ETB)"
          middle={<Input type="number" step="0.0001" className={cn(inputClass, "w-28 ml-auto")} value={s.p2_rate} onChange={e => set("p2_rate", e.target.value)} placeholder="0.0000" data-testid="input-calc-p2-rate" />}
          value={fmtEtb(c.p2_fcy_etb)} />
        <Row label="Margin Held" badge="Balance" middle={(c.opening_margin_pct * 100).toFixed(1) + "%"} value={fmtEtb(c.p2_margin_held)} />
        <Row label="Settlement Amount %" middle={(c.p2_settle_pct * 100).toFixed(1) + "%"} value={fmtEtb(c.p2_settle_etb)} />
        <Row label="NBE 2.5% Rate" middle="× 2.5%" value={fmtEtb(c.p2_nbe)} />
        <Row variant="input" label="Other Payment (USD, if any)"
          middle={<div className="flex items-center gap-2 justify-end"><Input type="number" className={cn(inputClass, "w-32")} value={s.p2_other_usd} onChange={e => set("p2_other_usd", e.target.value)} placeholder="0.00" data-testid="input-calc-p2-other" /><span className="text-[0.6rem] text-amber-700">USD</span></div>}
          value={c.p2_other_usd ? fmtEtb(c.p2_other_etb) : "—"} />
        <Row variant="total" label="TOTAL Remaining Settlement Debited" paid={!!paid.p2_settle} onTogglePaid={() => tp("p2_settle")} value={fmtEtb(c.total_p2_settle)} />
      </Section>

      {/* P2 FREIGHT */}
      <Section title="Remaining Units — Sea Freight" badge="Partial" hidden={shipType !== "partial"}>
        <Row label="Remaining Freight FCY (USD)" badge="Auto" middle="" value={fmtUSD(c.p2_ff_fcy)} />
        <Row variant="input" label="Remaining Freight Rate (ETB)"
          middle={<Input type="number" step="0.0001" className={cn(inputClass, "w-28 ml-auto")} value={s.p2_freight_rate} onChange={e => set("p2_freight_rate", e.target.value)} placeholder="0.0000" data-testid="input-calc-p2-freight-rate" />}
          value={fmtEtb(c.p2_ff_etb)} />
        <Row label="Bank Service Charge" hint="Fixed 4%" middle="× 4%" value={fmtEtb(c.p2_ff_bsc)} />
        <Row label="VAT on BSC" hint="Fixed 15%" middle="× 15%" value={fmtEtb(c.p2_ff_vat)} />
        <Row label="NBE 2.5% Rate" middle="× 2.5%" value={fmtEtb(c.p2_ff_nbe)} />
        <Row variant="total" label="TOTAL Remaining Freight Debited" paid={!!paid.p2_freight} onTogglePaid={() => tp("p2_freight")} value={fmtEtb(c.total_p2_freight)} />
      </Section>

      {/* GRAND TOTAL */}
      <Section title="Grand Total — CFR & Bank Charges">
        <Row variant="grand" label="TOTAL CFR & Bank Service Charges Paid (ETB)" value={fmtEtb(c.grand)} />
      </Section>
    </div>
  );
}
