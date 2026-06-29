export interface Sucursal {
  id: number;
  cantidad: number;
  multiplo: number;
}

export const SUCURSAL: Sucursal[] = [
  { id: 1, cantidad: 1, multiplo: 1 },
  { id: 2, cantidad: 2, multiplo: 1.5 },
  { id: 3, cantidad: 3, multiplo: 2.25 },
  { id: 4, cantidad: 4, multiplo: 3 },
  { id: 5, cantidad: 5, multiplo: 3.75 },
  { id: 6, cantidad: 6, multiplo: 4.5 },
]