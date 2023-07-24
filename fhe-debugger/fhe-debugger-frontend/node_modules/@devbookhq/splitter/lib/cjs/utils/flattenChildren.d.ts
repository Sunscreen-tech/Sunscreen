import { ReactNode, ReactChild } from 'react';
export default function flattenChildren(children: ReactNode, depth?: number, keys?: (string | number)[]): ReactChild[];
