import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, TrendingDown } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";

const budgetCategories = [
  { 
    name: "Electronics", 
    allocated: 1000000, 
    spent: 820000, 
    status: "healthy" as const,
    trend: { value: 12, direction: "up" as const }
  },
  { 
    name: "Textiles", 
    allocated: 800000, 
    spent: 560000, 
    status: "healthy" as const,
    trend: { value: 8, direction: "up" as const }
  },
  { 
    name: "Raw Materials", 
    allocated: 600000, 
    spent: 420000, 
    status: "healthy" as const,
    trend: { value: 5, direction: "down" as const }
  },
  { 
    name: "Machinery", 
    allocated: 500000, 
    spent: 485000, 
    status: "warning" as const,
    trend: { value: 15, direction: "up" as const }
  },
  { 
    name: "Chemicals", 
    allocated: 300000, 
    spent: 310000, 
    status: "exceeded" as const,
    trend: { value: 18, direction: "up" as const }
  },
];

export default function Budgets() {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const totalAllocated = budgetCategories.reduce((sum, cat) => sum + cat.allocated, 0);
  const totalSpent = budgetCategories.reduce((sum, cat) => sum + cat.spent, 0);
  const utilizationRate = (totalSpent / totalAllocated) * 100;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Budget Management</h1>
          <p className="text-sm text-muted-foreground">Monitor spending across categories</p>
        </div>
        <Button data-testid="button-add-budget">
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardHeader className="space-y-0 pb-2">
            <p className="text-sm font-medium text-muted-foreground">Total Allocated</p>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatCurrency(totalAllocated)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="space-y-0 pb-2">
            <p className="text-sm font-medium text-muted-foreground">Total Spent</p>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatCurrency(totalSpent)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="space-y-0 pb-2">
            <p className="text-sm font-medium text-muted-foreground">Utilization Rate</p>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{utilizationRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {budgetCategories.map((category) => {
          const percentage = (category.spent / category.allocated) * 100;
          
          return (
            <Card key={category.name} data-testid={`budget-${category.name.toLowerCase()}`}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">{category.name}</h3>
                      <StatusBadge status={category.status} />
                    </div>
                    <div className={`flex items-center gap-1 text-sm ${category.trend.direction === "up" ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                      {category.trend.direction === "up" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      <span>{category.trend.value}% vs last month</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {formatCurrency(category.spent)} spent of {formatCurrency(category.allocated)}
                      </span>
                      <span className="font-medium">{percentage.toFixed(1)}%</span>
                    </div>
                    <Progress 
                      value={percentage} 
                      className="h-2"
                    />
                  </div>

                  {category.spent > category.allocated && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      Exceeded by {formatCurrency(category.spent - category.allocated)}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
