import { useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Download, Filter } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const shipmentsData = [
  { id: "SH-2024-001", supplier: "Acme Electronics", origin: "Shanghai", destination: "New York", status: "in-transit" as const, eta: "2024-11-15", value: "$125,000" },
  { id: "SH-2024-002", supplier: "Global Textiles", origin: "Mumbai", destination: "Los Angeles", status: "arrived" as const, eta: "2024-10-28", value: "$89,500" },
  { id: "SH-2024-003", supplier: "Euro Parts GmbH", origin: "Hamburg", destination: "Chicago", status: "delayed" as const, eta: "2024-11-20", value: "$156,000" },
  { id: "SH-2024-004", supplier: "Pacific Trading", origin: "Singapore", destination: "Seattle", status: "in-transit" as const, eta: "2024-11-10", value: "$98,000" },
  { id: "SH-2024-005", supplier: "Asia Components", origin: "Shenzhen", destination: "San Francisco", status: "cleared" as const, eta: "2024-10-25", value: "$112,000" },
];

export default function Shipments() {
  const [search, setSearch] = useState("");

  const filteredShipments = shipmentsData.filter(
    (s) =>
      s.id.toLowerCase().includes(search.toLowerCase()) ||
      s.supplier.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Shipments</h1>
          <p className="text-sm text-muted-foreground">Track and manage your shipments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" data-testid="button-filter">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" data-testid="button-export">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button data-testid="button-add-shipment">
            <Plus className="h-4 w-4 mr-2" />
            Add Shipment
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search shipments..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search-shipments"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shipment ID</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Origin</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>ETA</TableHead>
                <TableHead className="text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredShipments.map((shipment) => (
                <TableRow key={shipment.id} className="hover-elevate" data-testid={`row-shipment-${shipment.id}`}>
                  <TableCell className="font-mono font-medium">{shipment.id}</TableCell>
                  <TableCell>{shipment.supplier}</TableCell>
                  <TableCell>{shipment.origin}</TableCell>
                  <TableCell>{shipment.destination}</TableCell>
                  <TableCell>
                    <StatusBadge status={shipment.status} />
                  </TableCell>
                  <TableCell>{shipment.eta}</TableCell>
                  <TableCell className="text-right font-medium">{shipment.value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
