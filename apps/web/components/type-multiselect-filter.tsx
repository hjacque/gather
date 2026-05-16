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

interface TypeMultiSelectFilterProps<TData> {
  table: Table<TData>;
  allTypes: string[];
}

export function TypeMultiSelectFilter<TData>({
  table,
  allTypes,
}: TypeMultiSelectFilterProps<TData>) {
  const typeColumn = table.getColumn('type');
  const selectedValues = (typeColumn?.getFilterValue() as string[]) ?? [];

  const toggleValue = (value: string) => {
    const newValues = selectedValues.includes(value)
      ? selectedValues.filter((v) => v !== value)
      : [...selectedValues, value];
    typeColumn?.setFilterValue(newValues.length ? newValues : undefined);
  };

  const clearAll = () => {
    typeColumn?.setFilterValue(undefined);
  };

  function formatTypeLabel(type: string) {
    if (type === 'booster_box_18') {
      return 'Booster Box (18 Boosters)';
    }
    return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  const selectedLabel =
    selectedValues.length === 0
      ? 'All Types'
      : selectedValues.length === 1
        ? formatTypeLabel(selectedValues[0])
        : `${selectedValues.length} selected`;

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
        {allTypes.map((type) => (
          <div
            key={type}
            className="flex items-center space-x-2 px-2 py-1 rounded hover:bg-muted cursor-pointer"
            onClick={() => toggleValue(type)}
          >
            <Checkbox
              id={`type-${type}`}
              checked={selectedValues.includes(type)}
              onCheckedChange={() => toggleValue(type)}
            />
            <Label htmlFor={`type-${type}`} className="capitalize">
              {formatTypeLabel(type)}
            </Label>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}
