import { useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Download } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const lcsData = [
  { id: "LC-2024-045", bank: "HSBC", beneficiary: "Acme Electronics", amount: "$125,000", openDate: "2024-10-01", expiry: "2025-01-15", status: "open" as const },
  { id: "LC-2024-046", bank: "Standard Chartered", beneficiary: "Global Textiles", amount: "$89,500", openDate: "2024-09-15", expiry: "2024-12-20", status: "issued" as const },
  { id: "LC-2024-047", bank: "Citibank", beneficiary: "Euro Parts GmbH", amount: "$156,000", openDate: "2024-10-10", expiry: "2025-02-28", status: "confirmed" as const },
  { id: "LC-2024-048", bank: "Deutsche Bank", beneficiary: "Pacific Trading", amount: "$98,000", openDate: "2024-08-20", expiry: "2024-11-30", status: "open" as const },
  { id: "LC-2024-049", bank: "HSBC", beneficiary: "Asia Components", amount: "$112,000", openDate: "2024-07-15", expiry: "2024-10-31", status: "closed" as const },
];

export default function LettersOfCredit() {
  const [search, setSearch] = useState("");

  const filteredLCs = lcsData.filter(
    (lc) =>
      lc.id.toLowerCase().includes(search.toLowerCase()) ||
      lc.beneficiary.toLowerCase().includes(search.toLowerCase()) ||
      lc.bank.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Letters of Credit</h1>
          <p className="text-sm text-muted-foreground">Manage your LC portfolio</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" data-testid="button-export-lcs">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button data-testid="button-add-lc">
            <Plus className="h-4 w-4 mr-2" />
            New LC
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search LCs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search-lcs"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>LC Number</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead>Beneficiary</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Open Date</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLCs.map((lc) => (
                <TableRow key={lc.id} className="hover-elevate" data-testid={`row-lc-${lc.id}`}>
                  <TableCell className="font-mono font-medium">{lc.id}</TableCell>
                  <TableCell>{lc.bank}</TableCell>
                  <TableCell>{lc.beneficiary}</TableCell>
                  <TableCell className="font-medium">{lc.amount}</TableCell>
                  <TableCell>{lc.openDate}</TableCell>
                  <TableCell>{lc.expiry}</TableCell>
                  <TableCell>
                    <StatusBadge status={lc.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
