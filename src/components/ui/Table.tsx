import type { ReactNode } from 'react';

export interface TableProps {
  children: ReactNode;
  className?: string;
}

export function Table({ children, className = '' }: TableProps) {
  return (
    <table
      className={`w-full border-collapse text-table-cell ${className}`}
    >
      {children}
    </table>
  );
}

export function TableHeader({ children, className = '' }: TableProps) {
  return (
    <thead className={className}>
      {children}
    </thead>
  );
}

export function TableBody({ children, className = '' }: TableProps) {
  return (
    <tbody className={className}>
      {children}
    </tbody>
  );
}

export function TableRow({
  children,
  className = '',
  style,
}: TableProps & { hover?: boolean; style?: React.CSSProperties }) {
  return (
    <tr
      className={`border-b border-[#F5F5F5] transition-colors duration-200 hover:bg-background-hover ${className}`}
      style={style}
    >
      {children}
    </tr>
  );
}

export function TableHead({
  children,
  className = '',
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={`py-3 px-4 text-left text-table-header font-semibold ${className}`}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableCell({
  children,
  className = '',
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={`py-3 px-4 text-table-cell ${className}`} {...props}>
      {children}
    </td>
  );
}
