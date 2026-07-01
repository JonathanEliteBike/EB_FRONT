export interface AvanceRow {
  id: number;
  sku: string;
  producto: string;
  marca: string;
  modelo: string;
  color: string;
  talla: string;
  forecast_total: number;
  pedido_total: number;
  restante: number;
  pct_cubierto: number;
  estados: Record<string, number>;
}
