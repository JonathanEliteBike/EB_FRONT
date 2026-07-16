export interface SimuladorRetroactivo {
  id: number;
  descripcion: string;
  cantidadIngresada: number;
  cantidadAMostrar: string;
  compraMinima: number;
  totalCompraConDescuento: number;
  porcentaje: number;
  totalMargenConDescuento: number;
  totalMargenCalculado: number;
  totalMargenConPorcentaje: number;
  totalBeneficios: number;
}