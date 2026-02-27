import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Columns } from 'lucide-react';

export default function TableEditor({ block, onChange }) {
  const tableData = block.table_data || { headers: ['Column 1', 'Column 2'], rows: [['', '']] };

  const updateHeader = (index, value) => {
    const headers = [...tableData.headers];
    headers[index] = value;
    onChange({ ...block, table_data: { ...tableData, headers } });
  };

  const updateCell = (rowIndex, colIndex, value) => {
    const rows = tableData.rows.map(r => [...r]);
    rows[rowIndex][colIndex] = value;
    onChange({ ...block, table_data: { ...tableData, rows } });
  };

  const addColumn = () => {
    const headers = [...tableData.headers, `Column ${tableData.headers.length + 1}`];
    const rows = tableData.rows.map(r => [...r, '']);
    onChange({ ...block, table_data: { headers, rows } });
  };

  const removeColumn = (colIndex) => {
    if (tableData.headers.length <= 1) return;
    const headers = tableData.headers.filter((_, i) => i !== colIndex);
    const rows = tableData.rows.map(r => r.filter((_, i) => i !== colIndex));
    onChange({ ...block, table_data: { headers, rows } });
  };

  const addRow = () => {
    const rows = [...tableData.rows, new Array(tableData.headers.length).fill('')];
    onChange({ ...block, table_data: { ...tableData, rows } });
  };

  const removeRow = (rowIndex) => {
    const rows = tableData.rows.filter((_, i) => i !== rowIndex);
    onChange({ ...block, table_data: { ...tableData, rows } });
  };

  return (
    <div className="space-y-3 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {tableData.headers.map((header, colIndex) => (
              <th key={colIndex} className="border border-slate-300 bg-slate-100 p-1">
                <div className="flex items-center gap-1">
                  <Input
                    value={header}
                    onChange={(e) => updateHeader(colIndex, e.target.value)}
                    className="h-7 text-xs font-semibold bg-transparent border-0 p-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-red-400 hover:text-red-600 flex-shrink-0"
                    onClick={() => removeColumn(colIndex)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </th>
            ))}
            <th className="border border-slate-300 bg-slate-100 w-8">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={addColumn}>
                <Plus className="w-3 h-3" />
              </Button>
            </th>
          </tr>
        </thead>
        <tbody>
          {tableData.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, colIndex) => (
                <td key={colIndex} className="border border-slate-200 p-1">
                  <Input
                    value={cell}
                    onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                    className="h-7 text-xs border-0 bg-transparent p-1"
                    placeholder="..."
                  />
                </td>
              ))}
              <td className="border border-slate-200 w-8 text-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-red-400 hover:text-red-600"
                  onClick={() => removeRow(rowIndex)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Button variant="outline" size="sm" onClick={addRow}>
        <Plus className="w-3 h-3 mr-1" /> Add Row
      </Button>
    </div>
  );
}