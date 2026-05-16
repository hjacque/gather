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

interface BlockMultiSelectFilterProps<TData> {
  table: Table<TData>;
  allBlocks: string[];
}

export function BlockMultiSelectFilter<TData>({
  table,
  allBlocks,
}: BlockMultiSelectFilterProps<TData>) {
  if (!allBlocks.length) {
    return <></>;
  }

  const blockColumn = table.getColumn('block');

  const selectedValues = (blockColumn?.getFilterValue() as string[]) ?? [];

  const toggleValue = (value: string) => {
    const newValues = selectedValues.includes(value)
      ? selectedValues.filter((v) => v !== value)
      : [...selectedValues, value];
    blockColumn?.setFilterValue(newValues.length ? newValues : undefined);
  };

  const clearAll = () => {
    blockColumn?.setFilterValue(undefined);
  };

  function formatBlockLabel(block: string) {
    return block
      .replace(/_/g, ' ')
      .replace('and', '&')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  const selectedLabel =
    selectedValues.length === 0
      ? 'All Blocks'
      : selectedValues.length === 1
        ? formatBlockLabel(selectedValues[0])
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
        {allBlocks.map((block) => (
          <div
            key={block}
            className="flex items-center space-x-2 px-2 py-1 rounded hover:bg-muted cursor-pointer"
            onClick={() => toggleValue(block)}
          >
            <Checkbox
              id={`block-${block}`}
              checked={selectedValues.includes(block)}
              onCheckedChange={() => toggleValue(block)}
            />
            <Label htmlFor={`block-${block}`} className="capitalize">
              {formatBlockLabel(block)}
            </Label>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}
