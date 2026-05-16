import { Table } from '@tanstack/react-table';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ChevronDown } from 'lucide-react';

interface SetMultiSelectFilterProps<TData> {
  table: Table<TData>;
  allProductSets: string[];
}

export function ProductSetMultiSelectFilter<TData>({
  table,
  allProductSets,
}: SetMultiSelectFilterProps<TData>) {
  const setColumn = table.getColumn('set');
  const selectedValues = (setColumn?.getFilterValue() as string[]) ?? [];

  const toggleValue = (value: string) => {
    const newValues = selectedValues.includes(value)
      ? selectedValues.filter((v) => v !== value)
      : [...selectedValues, value];
    setColumn?.setFilterValue(newValues.length ? newValues : undefined);
  };

  const clearAll = () => {
    setColumn?.setFilterValue(undefined);
  };

  const selectedLabel =
    selectedValues.length === 0
      ? 'All Sets'
      : selectedValues.length === 1
        ? selectedValues[0]
        : `${selectedValues.length} selected`;

  const slugify = (str: string) =>
    str
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-60 justify-between bg-gradient-to-t from-primary/5 to-card dark:bg-card backdrop-blur-md shadow-xs"
        >
          {selectedLabel}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-2 space-y-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAll}
          className="w-full justify-start"
        >
          All
        </Button>
        {allProductSets.map((productSet) => (
          <div
            key={productSet}
            className="flex items-center space-x-2 px-2 py-1 rounded hover:bg-muted cursor-pointer"
            onClick={() => toggleValue(productSet)}
          >
            <Checkbox
              id={`productSet-${slugify(productSet)}`}
              checked={selectedValues.includes(productSet)}
              onCheckedChange={() => toggleValue(productSet)}
            />
            <Label
              htmlFor={`productSet-${slugify(productSet)}`}
              className="capitalize"
            >
              {productSet}
            </Label>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}
